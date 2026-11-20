'use strict';
/* Minimal interactive touches: copy-to-clipboard and delete confirmation.
 * No framework; everything falls back to plain browser behavior. */
document.addEventListener('click', function (event) {
  var target = event.target;
  // "Copy again" buttons replay a previously sent message
  if (target.matches && target.matches('.btn-copy[data-copy]')) {
    copyText(target.getAttribute('data-copy'));
    var original = target.textContent;
    target.textContent = 'Copied';
    setTimeout(function () { target.textContent = original; }, 1500);
    return;
  }
  // Delete forms ask first
  if (target.matches && target.matches('button[type="submit"]')) {
    var form = target.form;
    if (form && form.hasAttribute('data-confirm')) {
      if (!window.confirm(form.getAttribute('data-confirm'))) event.preventDefault();
    }
  }
});
// Template picker re-renders the draft server-side on change
var autoSubmit = document.querySelector('select[data-autosubmit]');
if (autoSubmit) {
  autoSubmit.addEventListener('change', function () {
    if (autoSubmit.form) autoSubmit.form.submit();
  });
}
// "Copy subject + body" reads the composer's live values, not a snapshot
var draftCopy = document.querySelector('.btn-copy-draft');
if (draftCopy) {
  draftCopy.addEventListener('click', function () {
    var form = draftCopy.closest ? draftCopy.closest('form') : draftCopy.parentNode;
    var subject = form ? form.querySelector('[name="subject"]') : null;
    var body = form ? form.querySelector('[name="body"]') : null;
    if (!subject || !body) return;
    copyText(subject.value + '\n\n' + body.value);
    var original = draftCopy.textContent;
    draftCopy.textContent = 'Copied';
    setTimeout(function () { draftCopy.textContent = original; }, 1500);
  });
}
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(function () { fallbackCopy(text); });
  } else {
    fallbackCopy(text);
  }
}
function fallbackCopy(text) {
  var area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  try { document.execCommand('copy'); } catch (err) { /* clipboard unavailable */ }
  document.body.removeChild(area);
}
