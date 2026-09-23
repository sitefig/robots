// Entry point of every /app/ page: register the custom elements and let them
// fetch what they need. The theme switch and the language menu come from the
// site's own page script, so the app looks like the rest of sus.bot.

import { register } from './elements.ts';

register();
