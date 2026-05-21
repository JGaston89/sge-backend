/**
 * Curated list of disposable/temporary email providers.
 * All entries are lowercase, no leading dot.
 */
export const TEMP_EMAIL_DOMAINS = new Set<string>([
  // ── Mailinator family ────────────────────────────────────────
  'mailinator.com', 'mailinator2.com', 'trashmail.com', 'trashmail.at',
  'trashmail.io', 'trashmail.me', 'trashmail.net', 'trashmail.org',
  // ── Guerrilla Mail ───────────────────────────────────────────
  'guerrillamail.com', 'guerrillamail.info', 'guerrillamail.biz',
  'guerrillamail.de', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamailblock.com', 'grr.la', 'spam4.me',
  // ── TempMail / 10-minute family ──────────────────────────────
  'tempmail.com', 'tempmail.net', 'tempmail.org', 'tempmail.de',
  'temp-mail.org', 'temp-mail.io', 'temp-mail.ru',
  'tempr.email', 'tempemail.com', 'tempemail.net',
  '10minutemail.com', '10minutemail.net', '10minutemail.org',
  '10minutemail.de', '10minutemail.nl', '10minemail.com',
  '20minutemail.com', '20minutemail.it',
  '33mail.com', 'spamgourmet.com', 'spamgourmet.net', 'spamgourmet.org',
  // ── YOPmail ──────────────────────────────────────────────────
  'yopmail.com', 'yopmail.fr', 'cool.fr.nf', 'jetable.fr.nf',
  'nospam.ze.tc', 'nomail.xl.cx', 'mega.zik.dj', 'speed.1s.fr',
  // ── Sharklasers / Guerrilla aliases ──────────────────────────
  'sharklasers.com', 'guerrillamailblock.com', 'spam4.me',
  // ── MailDrop / SpamGourmet ───────────────────────────────────
  'maildrop.cc', 'spamoff.de', 'spam.la',
  // ── Throwam / Throwaway ──────────────────────────────────────
  'throwam.com', 'throam.com', 'throwaway.email',
  'throwam.com', 'discard.email',
  // ── Fake / Spoof domains ─────────────────────────────────────
  'fakeinbox.com', 'fakeinbox.net', 'fakemail.fr', 'fakemail.net',
  'fakemail.store', 'spoofmail.de', 'spambox.us', 'spambox.info',
  'spambox.org', 'spambox.co', 'spambox.me', 'spambox.xyz',
  // ── Burner / Disposable ──────────────────────────────────────
  'burnermail.io', 'burnthespam.info', 'byom.de',
  'dispostable.com', 'disposableaddress.com', 'disposablemail.com',
  'getairmail.com', 'getnada.com', 'mailnull.com',
  // ── Binkmail / Bobmail ───────────────────────────────────────
  'binkmail.com', 'bobmail.info', 'bodhi.lawlita.com',
  // ── Crap mail ────────────────────────────────────────────────
  'crap.handcrafted.jp', 'crapmail.org', 'cust.in',
  // ── Mailnesia / Mailnull ─────────────────────────────────────
  'mailnesia.com', 'mailnull.com', 'mailscrap.com',
  // ── Harakiri / Jetable ───────────────────────────────────────
  'harakirimail.com', 'jetable.com', 'jetable.net', 'jetable.org',
  'jetable.fr.nf', 'jetable.pp.ua', 'jetable.ru',
  // ── MXFaker / NotMyMail ──────────────────────────────────────
  'mxfaker.com', 'notmymail.com', 'notmymob.com',
  // ── Now / Obobbo ─────────────────────────────────────────────
  'now.im', 'obobbo.com', 'oneoffemail.com',
  // ── PookMail / Proxymail ─────────────────────────────────────
  'pookmail.com', 'proxymail.eu', 'putthisinyourspamdatabase.com',
  // ── Rppkn / Safetymail ───────────────────────────────────────
  'rppkn.com', 'safetymail.info', 'sandelf.de',
  // ── Sharedmailbox / Shopadminvvh ─────────────────────────────
  'sharedmailbox.org',
  // ── Smellfear / Snkmail ──────────────────────────────────────
  'smellfear.com', 'snkmail.com', 'sofimail.com',
  // ── Spamavert / Spaml ────────────────────────────────────────
  'spamavert.com', 'spaml.com', 'spaml.de',
  // ── Tafmail / Tagyourself ────────────────────────────────────
  'tafmail.com', 'tagyourself.com', 'teewars.org',
  // ── Trash / Trbvm ────────────────────────────────────────────
  'trash2009.com', 'trash2010.com', 'trash2011.com', 'trbvm.com',
  'trillianpro.com', 'turual.com',
  // ── Uggsrock / Uroid ─────────────────────────────────────────
  'uggsrock.com', 'uroid.com',
  // ── Wegwerfadresse / Wh4f ───────────────────────────────────
  'wegwerfadresse.de', 'wh4f.org', 'whyspam.me',
  // ── Xagloo / Xoxy ────────────────────────────────────────────
  'xagloo.com', 'xoxy.net',
  // ── Yes / YesMail ────────────────────────────────────────────
  'yes.im',
  // ── Zillaform / Zoemail ──────────────────────────────────────
  'zoemail.com', 'zoemail.net', 'zoemail.org',
  // ── Mailpoof / Mohmal ────────────────────────────────────────
  'mailpoof.com', 'mohmal.com',
  // ── Extra known spam domains ─────────────────────────────────
  'spamgob.com', 'spam.la', 'spamhereplease.com',
  'tempinbox.com', 'tempomail.fr', 'temporaryemail.com',
  'temporaryemail.net', 'temporaryinbox.com', 'thanksnospam.info',
  'thisismytempemail.com', 'throwam.com',
]);
