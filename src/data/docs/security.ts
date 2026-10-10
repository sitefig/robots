// What the file exposes: Disallow lines that name a sensitive location and so
// advertise it. robots.txt is public and is the first file a scanner reads, so
// every one of these pages ends in the same place: fix the path, not the line.

import type { Doc } from '../../lib/docs.ts';

export const SECURITY: Record<string, Doc> = {
  'security.admin': {
    title: 'A Disallow line for the admin panel tells everyone where the login is',
    summary: 'Blocking /admin/, /wp-login.php or a renamed control panel in a public file turns the rule into a signpost for the login page.',
    what: 'sus.bot flags a Disallow rule whose path looks like an administrative interface: /admin/, /administrator/, /wp-admin/, /wp-login.php, /cpanel/, /phpmyadmin/, /adminer.php, /backoffice/, /manager/, /console/ and the admin paths of Umbraco and TYPO3 among them. When the path is one that every site on the detected platform publishes, the finding drops to a note, because it discloses nothing.',
    why: 'robots.txt is the first file both a scanner and a curious person read, so a renamed admin path becomes public the moment it appears there. Obscurity was the only thing the rename bought, and the line spends it. From there the login is a target for credential stuffing and for whatever vulnerability the panel has this month.',
    fix: 'Put the panel behind authentication, and behind an IP allowlist or a VPN if only staff reach it. Send X-Robots-Tag: noindex on the login response to keep it out of search results, which is what the Disallow was for, then delete the rule. Removing the line secures nothing by itself, so do it last.',
    example: {
      wrong: 'User-agent: *\nDisallow: /manage-7f3b/\nDisallow: /wp-login.php',
      right: 'User-agent: *\nDisallow: /cart/\nDisallow: /checkout/',
    },
    also: ['security.staging', 'security.api', 'recon.stack'],
  },
  'security.staging': {
    title: 'Blocking a staging or dev path publishes where the unfinished site lives',
    summary: 'A rule for /staging/, /dev/ or /v2-redesign/ names a copy of the site that is almost always less protected than the one in front of it.',
    what: 'sus.bot flags Disallow rules naming a non-production environment: /staging/, /stage/, /dev/, /test/, /qa/, /uat/, /beta/, /alpha/, /sandbox/, /preprod/, /preview/, /demo/, /old-site/, /new-site/ and /tmp/. A leading version segment such as /v2/, or /api/v1/, is reported at low severity, because it is more often an old or unreleased copy than a live route.',
    why: 'A staging copy is where debug output is on, errors are verbose, the password is the project name and the production database from last month was restored for testing. It also competes with the live site in search results. Of everything a robots.txt gives away, the address of a second and softer copy of the site is the most useful.',
    fix: 'Take the environment off the public internet with a VPN, an IP allowlist or at least HTTP authentication, which keeps crawlers out without naming the path. If it has to stay reachable, send X-Robots-Tag: noindex from the staging host and give that host its own robots.txt. Then remove the rule from the live file.',
    example: {
      wrong: 'User-agent: *\nDisallow: /staging/\nDisallow: /v2-redesign/',
      right: 'User-agent: *\nDisallow: /cart/',
    },
    also: ['recon.hosts', 'security.version', 'security.admin'],
  },
  'security.backups': {
    title: 'A rule for a backup folder or a .sql file is a download link',
    summary: 'Disallow: /backup/ and Disallow: /*.sql$ both say a copy of the site or its database is sitting under the web root, and roughly where to ask for it.',
    what: 'Two signatures fire here, both at the highest severity sus.bot has. One is a folder name: /backup/, /backups/, /bak/, /bkp/, /dump/, /dumps/, /db/, /database/, /sql/, /archive/ or /snapshots/. The other is a file type at the end of a rule: .sql, .bak, .old, .orig, .save, .swp, .zip, .tar, .gz, .tgz, .7z, .rar and .dump.',
    why: 'A database dump is the whole site in one file: customer records, order history, password hashes, session tokens and the credentials stored in configuration. It needs no exploit, only the URL, and the URL is now half guessed. A zipped copy of the web root hands over the source code as well, which is where the next finding comes from.',
    fix: 'Backups do not belong under the web root. Move them outside it, or into object storage that is not publicly readable, then request the old URL and confirm it answers 404. Check that directory listing is off for the folder that held them. If a dump was reachable, treat the data as exposed and rotate every credential in it.',
    example: {
      wrong: 'User-agent: *\nDisallow: /backup/\nDisallow: /*.sql$',
      right: 'User-agent: *\nDisallow: /search/',
    },
    also: ['recon.extensions', 'security.secrets', 'security.data'],
  },
  'security.secrets': {
    title: 'Naming .env, .git or a config file in robots.txt points straight at the credentials',
    summary: 'Rules for /.env, /.git/, /wp-config.php and folders called /secrets/ or /keys/ are reported at the highest severity, because one readable file ends the conversation.',
    what: 'sus.bot flags rules naming a configuration, version-control or credential file: .env and its variants, .git, .svn, .hg, .htaccess, .htpasswd, .aws, .ssh, id_rsa, wp-config.php, config.php, configuration.php, settings.py, appsettings.json, web.config, composer.json and package.json. Folder names such as /secrets/, /credentials/, /keys/, /certs/, /passwords/ and /vault/ fire too, and /vendor/ or /node_modules/ at a lower severity.',
    why: 'An .env file holds the database password, the mail credentials and the payment keys in plain text. A readable .git folder hands over the source and its whole history, including the key somebody committed and then removed. Neither needs a vulnerability, and both are what automated scanners request on every site they meet, whether or not a rule mentions them.',
    fix: 'Block these paths at the web server or the proxy rather than in robots.txt, and confirm the URL returns 403 or 404. Keep .env files and deployment folders outside the web root. If anything was readable, assume it was read, and rotate every key and password in it. Dependency folders should not be served either.',
    example: {
      wrong: 'User-agent: *\nDisallow: /.env\nDisallow: /.git/\nDisallow: /secrets/',
      right: 'User-agent: *\nDisallow: /compare/',
    },
    also: ['security.backups', 'recon.extensions', 'security.version'],
  },
  'security.api': {
    title: 'Internal APIs and debug endpoints in robots.txt are read by scanners, not crawlers',
    summary: 'Rules for /api/internal/, /actuator/, /swagger/, /phpinfo.php or /graphql tell a scripted scanner exactly which endpoints to try first.',
    what: 'sus.bot flags rules naming an internal API or a debug endpoint: /api/internal/, /api/private/, /api/admin/, /api/debug/, /internal/, /debug/, /actuator/, /swagger/, /api-docs/, /openapi.json, /graphql, /graphiql, /metrics/, /phpinfo.php, /server-status, /trace, /elmah.axd, /_profiler/, /telescope/ and /horizon/. /xmlrpc.php is reported on its own, and /wp-json/ or /rest/ at low severity.',
    why: 'Crawlers are not the risk here. A Spring Boot actuator can print the whole environment, including the database password. A Swagger page lists every endpoint with its parameters. phpinfo prints paths, versions and extensions. xmlrpc.php lets one request try many passwords. These are the paths scanners ask for, and the rule confirms they are worth asking for.',
    fix: 'Require authentication, or restrict the endpoint to an internal network. Turn profilers, management endpoints and debug tooling off in the production build instead of relying on the path being unknown, and turn xmlrpc.php off if nothing uses it. A public API that is meant to be public can stay, and so can its rule.',
    example: {
      wrong: 'User-agent: *\nDisallow: /api/internal/\nDisallow: /actuator/\nDisallow: /phpinfo.php',
      right: 'User-agent: *\nDisallow: /cart/',
    },
    also: ['recon.api', 'security.admin', 'security.maintenance'],
  },
  'security.data': {
    title: 'A Disallow line for uploads or exports says the files are there to be downloaded',
    summary: 'Rules for /uploads/, /invoices/, /exports/, /customers/ or /logs/ name folders of user data, and a Disallow does nothing to protect any of them.',
    what: 'sus.bot flags rules naming user data, uploads or exported files: /uploads/, /upload/, /files/, /documents/, /invoices/, /exports/, /reports/, /customers/, /users/, /members/, /accounts/, /orders/, /logs/, /private/, /confidential/, /internal-docs/, /intranet/, /hr/ and /payroll/. The severity is low on its own, because the folder name is a reasonable guess about the contents rather than proof.',
    why: 'A Disallow asks polite crawlers to look away. It stops nobody else, and it never stops a person. If directory listing is on, the folder is a file browser. If invoice numbers run in sequence, one readable invoice is all of them. Personal data reachable without a login is a breach whether or not a search engine ever indexed it.',
    fix: 'Turn directory listing off. Serve private files through code that checks the session instead of from a public folder, and give uploads unguessable names. Keep log files out of the web root. Once the folder needs a login, the only job left for the rule is keeping the login page out of search results, and a noindex header does that better.',
    example: {
      wrong: 'User-agent: *\nDisallow: /uploads/\nDisallow: /invoices/',
      right: 'User-agent: *\nDisallow: /checkout/',
    },
    also: ['recon.data', 'security.backups', 'recon.extensions'],
  },
  'security.version': {
    title: 'changelog.txt and readme.html name the version an attacker looks up first',
    summary: 'A rule for /changelog.txt, /install.txt, /readme.html or /license.txt says the file is still on the server, and those files name the software and its release.',
    what: 'sus.bot flags rules naming a file that identifies the software: changelog.txt, install.txt, install.mysql.txt, install.pgsql.txt, install.sqlite.txt, upgrade.txt, maintainers.txt, and readme.html, readme.md or readme.txt. A rule for license.txt is reported at low severity, because it names the product but not always the release. Where these are stock lines of the detected platform, they are reported as a note.',
    why: 'The first question about a site is what it runs and which version. changelog.txt answers both exactly, and the published vulnerability lists do the rest. The file is left behind by the installer, does nothing once the site is running, and is requested far more often by scanners than read by people.',
    fix: 'Delete the files from the server instead of hiding them in robots.txt, then confirm the URLs return 404. If the platform recreates them on every update, remove them in the deployment step or block the paths at the web server. Keep the software patched either way, because the version is readable in other ways too.',
    example: {
      wrong: 'User-agent: *\nDisallow: /changelog.txt\nDisallow: /readme.html',
      right: 'User-agent: *\nDisallow: /print/',
    },
    also: ['recon.stack', 'security.maintenance', 'recon.generators'],
  },
  'security.maintenance': {
    title: 'install.php and update.php must not be reachable once the site is live',
    summary: 'A rule for /install.php, /setup.php, /update.php, /upgrade.php or /cron.php names a script that can reconfigure the site or be called all day for free.',
    what: 'sus.bot flags Disallow rules naming an installer or maintenance script: install.php, setup.php, update.php, upgrade.php and cron.php, at the root or inside a folder. The rule is often a stock line that the platform ships, which means it sits in the file whether or not the scripts are still on the server.',
    why: 'An installer that is still reachable can sometimes be pointed at a new database, which hands over the site. An update script that runs without a login runs for anyone who asks. A cron endpoint that does real work on every request is a cheap way to load the server. None of the three needs to be reachable on a live site.',
    fix: 'Delete the installer after setup and confirm the URL returns 404. Restrict update.php and the other maintenance scripts to an IP address or require a login. Run scheduled work from the system scheduler or the platform command line rather than over HTTP. Once the script is gone, delete the rule that pointed at it.',
    example: {
      wrong: 'User-agent: *\nDisallow: /install.php\nDisallow: /update.php',
      right: 'User-agent: *\nDisallow: /go/',
    },
    also: ['security.version', 'security.admin', 'recon.stack'],
  },
  'security.server': {
    title: 'A rule for /cgi-bin/ points at the server, not at the site',
    summary: 'Disallow: /cgi-bin/ is usually copied from an old template, and if something does answer there it deserves more attention than a crawler rule.',
    what: 'sus.bot flags Disallow rules naming a server script directory: /cgi-bin/, /cgi/ and /fcgi-bin/, at low severity. The path belongs to the web server rather than to the site, and the rule travels from template to template and from agency to agency long after the last CGI script was removed.',
    why: 'If nothing is served there, the rule costs you one line that tells a reader where to look. If something is served there, it is likely an old script in Perl or C that nobody has opened in years, and those are a standing target. Either way, the Disallow line is not what decides the outcome.',
    fix: 'Request the path and read the answer. If it is 404, delete the rule. If a script replies, decide whether it is still needed, retire it if not, and put authentication or an IP restriction in front of it if it is. Turn the CGI handler off in the server configuration when nothing uses it any more.',
    example: {
      wrong: 'User-agent: *\nDisallow: /cgi-bin/',
      right: 'User-agent: *\nDisallow: /wishlist/',
    },
    also: ['recon.tech', 'recon.extensions', 'security.api'],
  },
};
