'use client';

import { useEffect, useRef, useState } from 'react';
import { FIXED_STYLE } from '../shared';

// Inline "Type" / "Upload Video" input rendered directly inside a postcard's
// left panel — replaces the old separate message/video form fields.
export default function TributeInline({ tribute, onPickText, onPickVideo, onMessageChange, onClear }) {
  const { mode, message, videoUrl } = tribute;
  const textareaRef = useRef(null);
  const wrapperRef = useRef(null);
  const lastFitMessageRef = useRef('');
  const isRevertingRef = useRef(false);
  const [limitReached, setLimitReached] = useState(false);

  // Auto-grow the textarea to fit its content, starting from a single line
  // so short messages begin centered in the box. Once content would need
  // more room than the postcard has, revert the last keystroke instead of
  // letting it overflow/scroll, and tell the student why.
  useEffect(() => {
    const el = textareaRef.current;
    const wrapper = wrapperRef.current;
    if (!el || !wrapper) return;

    el.style.height = 'auto';
    const needed = el.scrollHeight;
    const available = wrapper.clientHeight;

    if (needed > available) {
      el.style.height = `${available}px`;
      setLimitReached(true);
      isRevertingRef.current = true;
      onMessageChange(lastFitMessageRef.current);
      return;
    }

    el.style.height = `${needed}px`;
    lastFitMessageRef.current = message;
    if (isRevertingRef.current) {
      isRevertingRef.current = false;
    } else {
      setLimitReached(false);
    }
  }, [message, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (mode === 'video') {
    return (
      <>
        {videoUrl && <video controls src={videoUrl} />}
        <button type="button" className="tribute-clear" onClick={onClear}>Change</button>
      </>
    );
  }

  if (mode === 'text') {
    return (
      <div className="tribute-text-input" ref={wrapperRef}>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <textarea
          ref={textareaRef}
          autoFocus
          rows={1}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="Write your appreciation..."
          style={{ color: FIXED_STYLE.textColor, fontSize: FIXED_STYLE.fontSize }}
        />
        {limitReached && <div className="tribute-limit-warning">This postcard is full — shorten your message to keep editing.</div>}
        <button type="button" className="tribute-clear" onClick={onClear}>Change</button>
      </div>
    );
  }

  return (
    <div className="tribute-picker">
      <button type="button" className="tribute-picker-btn" onClick={onPickText}>Type</button>
      <span className="tribute-picker-or">Or</span>
      <button type="button" className="tribute-picker-btn" onClick={onPickVideo}>Upload Video</button>
      <span className="muted tiny">Videos up to 200MB</span>
    </div>
  );
}
