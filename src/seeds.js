'use strict';
/**
 * Default settings and starter message templates.
 * Templates contain two kinds of tokens:
 *  - Data tokens ({{name}}, {{their_work}}, ...) are filled from the prospect
 *    and settings automatically.
 *  - Bracket slots like [name the specific page...] are personalization
 *    prompts left in the text on purpose. Cadence Pipeline never sends email
 *    itself: you review, edit, and send each message from your own inbox.
 */
const defaultSettings = () => ({
  senderName: '',
  contactEmail: '',
  myOffer: '',
  dailyTarget: 10,
});
function seedTemplates() {
  return [
    {
      id: 1,
      name: 'First contact: editing services',
      serviceName: 'Editing & publishing services',
      subject: 'Quick question about {{their_work}}',
      body: [
        'Hi {{name}},',
        '',
        'I looked at {{their_work}} and one thing stood out to me: [name the specific page, section, or habit you noticed].',
        '',
        "I'm {{sender_name}}, a freelance editor and publishing consultant. I help writers take work that is close and make it clean, consistent, and ready for readers: structural editing, proofreading, and upload-ready formatting for print and ebook.",
        '',
        "If it would be useful, I'd be glad to review a short sample and send back specific notes. No charge, no obligation. Would some time in the next two weeks suit you?",
        '',
        'Best,',
        '{{sender_name}}',
      ].join('\n'),
    },
    {
      id: 2,
      name: 'Follow-up: gentle second touch',
      serviceName: 'Editing & publishing services',
      subject: 'Re: Quick question about {{their_work}}',
      body: [
        'Hi {{name}},',
        '',
        'Just floating this back to the top of your inbox. I know how a week disappears.',
        '',
        'My offer stands: a free, specific set of notes on a short sample of {{their_work}}. If the timing is wrong, a simple "not now" is a perfectly good answer, and I will stop here.',
        '',
        'Best,',
        '{{sender_name}}',
      ].join('\n'),
    },
    {
      id: 3,
      name: 'Close the loop: no reply',
      serviceName: 'Any',
      subject: 'Re: Quick question about {{their_work}}',
      body: [
        'Hi {{name}},',
        '',
        "I'll step back and close the loop so I'm not cluttering your inbox. If editing, proofreading, or formatting ever moves up your list, you are welcome to reach me at this address.",
        '',
        'Wishing you a smooth launch for {{their_work}}.',
        '',
        'Best,',
        '{{sender_name}}',
      ].join('\n'),
    },
    {
      id: 4,
      name: 'First contact: book-business outreach',
      serviceName: 'Book business (reviewers, newsletters)',
      subject: 'A practical series your readers might want to know about',
      body: [
        'Hi {{name}},',
        '',
        'I publish The Human Operating System, a series of practical books on how people actually get themselves to begin, finish, and follow through on the work that matters to them. {{their_work}} seems like a natural fit for that kind of reader.',
        '',
        "I'm not pitching a swap or a favor. If you would like a copy to judge for yourself, I will gladly send one, and you can set it aside afterward if it is not for your audience. Worth a look?",
        '',
        'Best,',
        '{{sender_name}}',
      ].join('\n'),
    },
  ];
}
module.exports = { defaultSettings, seedTemplates };
