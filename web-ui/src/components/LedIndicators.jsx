import React from 'react';

export default function LedIndicators({ led12Ref, led13Ref }) {
  return (
    <div className="sim-leds">
      <div className="sim-led-item">
        <svg width="32" height="32" viewBox="0 0 32 32">
          <circle ref={led12Ref} cx="16" cy="16" r="11" className="led-body sim-led" />
        </svg>
        <span>D12</span>
      </div>
      <div className="sim-led-item">
        <svg width="32" height="32" viewBox="0 0 32 32">
          <circle ref={led13Ref} cx="16" cy="16" r="11" className="led-body sim-led" />
        </svg>
        <span>D13 (LED_BUILTIN)</span>
      </div>
    </div>
  );
}
