import React from 'react';
import { useCircuitStore } from '../state/circuitStore';
import { DEVICE_TYPES } from '../sim/devices';
import { channelColorForIndex } from '../utils/channelColors';
import {
  formatOhms, formatFarads, formatHenry, formatCurrent, formatVoltage, formatSiemens, formatFrequency,
} from '../utils/formatUnits';
import TutorChat from './TutorChat';
import TutorialPanel from './TutorialPanel';

const RESISTOR_PRESETS  = [100, 220, 330, 1000, 4700, 10000];
const BATTERY_PRESETS   = [1.5, 3.3, 5, 9, 12];
const CAPACITOR_PRESETS = [10e-6, 100e-6, 470e-6, 1e-3, 10e-3];
const INDUCTOR_PRESETS  = [10e-3, 100e-3, 0.47, 1];
const MOTOR_PRESETS     = [5, 10, 15, 25];
const WAVEFORM_PRESETS  = ['sine', 'square', 'triangle', 'sawtooth'];
const FREQUENCY_PRESETS = [1, 10, 100, 1000, 10000];
const AMPLITUDE_PRESETS = [0.5, 1, 2, 2.5, 5];
const OFFSET_PRESETS    = [0, 1, 2.5];

const TRANSISTOR_TYPES = ['bjt_npn', 'bjt_pnp', 'mosfet_n', 'mosfet_p'];

function PresetButtons({ presets, value, onSelect }) {
  return (
    <div className="preset-row">
      {Object.entries(presets).map(([key, p]) => (
        <button key={key} className={`preset-chip ${value === key ? 'is-active' : ''}`} onClick={() => onSelect(key)}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

export default function Inspector() {
  // Lifted into circuitStore (not local state) so other UI - e.g.
  // ShortPlacementWarning's "ask AI to fix this" - can jump straight to the
  // AI Tutor tab.
  const activeTab          = useCircuitStore((s) => s.inspectorTab);
  const setActiveTab       = useCircuitStore((s) => s.setInspectorTab);
  const components        = useCircuitStore((s) => s.components);
  const wires             = useCircuitStore((s) => s.wires);
  const selectedId        = useCircuitStore((s) => s.selectedId);
  const updateComponentValue = useCircuitStore((s) => s.updateComponentValue);
  const removeElement     = useCircuitStore((s) => s.removeElement);
  const running           = useCircuitStore((s) => s.running);
  const simResult         = useCircuitStore((s) => s.simResult);

  const selected = components.find((c) => c.id === selectedId);
  const current  = running && selected ? (simResult.currents.get(selected.id) ?? 0) : null;
  const deviceInfo = running && selected ? simResult.deviceInfo.get(selected.id) : null;
  const probeIndex = selected?.type === 'probe'
    ? components.filter((c) => c.type === 'probe').findIndex((c) => c.id === selected.id)
    : -1;

  return (
    <aside className="inspector">
      <div className="inspector-tabs">
        <button
          className={`inspector-tab ${activeTab === 'inspector' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('inspector')}
        >
          Inspector
        </button>
        <button
          className={`inspector-tab ${activeTab === 'tutor' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('tutor')}
        >
          AI Tutor
        </button>
        <button
          className={`inspector-tab ${activeTab === 'tutorials' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('tutorials')}
        >
          Tutorials
        </button>
      </div>

      {activeTab === 'tutor' && <TutorChat />}
      {activeTab === 'tutorials' && <TutorialPanel />}
      {activeTab === 'inspector' && (
      <>
      {selected ? (
        <div className="selected-panel">
          <div className="selected-type">{selected.type}</div>

          {selected.type === 'resistor' && (
            <div className="preset-row">
              {RESISTOR_PRESETS.map((v) => (
                <button key={v} className={`preset-chip ${selected.value === v ? 'is-active' : ''}`}
                  onClick={() => updateComponentValue(selected.id, v)}>
                  {formatOhms(v)}
                </button>
              ))}
            </div>
          )}

          {selected.type === 'battery' && (
            <div className="preset-row">
              {BATTERY_PRESETS.map((v) => (
                <button key={v} className={`preset-chip ${selected.value === v ? 'is-active' : ''}`}
                  onClick={() => updateComponentValue(selected.id, v)}>
                  {v}V
                </button>
              ))}
            </div>
          )}

          {selected.type === 'capacitor' && (
            <>
              <div className="preset-row">
                {CAPACITOR_PRESETS.map((v) => (
                  <button key={v} className={`preset-chip ${selected.value === v ? 'is-active' : ''}`}
                    onClick={() => updateComponentValue(selected.id, v)}>
                    {formatFarads(v)}
                  </button>
                ))}
              </div>
              <div className="reading">value: {formatFarads(selected.value)}</div>
              <div className="reading" style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                open circuit at DC — blocks steady-state current
              </div>
            </>
          )}

          {selected.type === 'inductor' && (
            <>
              <div className="preset-row">
                {INDUCTOR_PRESETS.map((v) => (
                  <button key={v} className={`preset-chip ${selected.value === v ? 'is-active' : ''}`}
                    onClick={() => updateComponentValue(selected.id, v)}>
                    {formatHenry(v)}
                  </button>
                ))}
              </div>
              <div className="reading">value: {formatHenry(selected.value)}</div>
              <div className="reading" style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                short circuit at DC — passes current freely
              </div>
            </>
          )}

          {selected.type === 'motor' && (
            <>
              <div className="preset-row">
                {MOTOR_PRESETS.map((v) => (
                  <button key={v} className={`preset-chip ${selected.value === v ? 'is-active' : ''}`}
                    onClick={() => updateComponentValue(selected.id, v)}>
                    {formatOhms(v)} winding
                  </button>
                ))}
              </div>
              {current !== null && (
                <>
                  <div className="reading">current: {formatCurrent(current)}</div>
                  <div className="reading">
                    est. speed: {Math.abs(current) > 1e-4
                      ? `${Math.round(Math.abs(current) * 8000)} RPM`
                      : 'stalled'}
                  </div>
                </>
              )}
            </>
          )}

          {selected.type === 'servo' && (
            <>
              <div className="reading">load: {formatOhms(selected.value)}</div>
              {current !== null && (
                <>
                  <div className="reading">current: {formatCurrent(current)}</div>
                  <div className="reading">
                    status: {Math.abs(current) > 1e-5 ? 'active' : 'idle'}
                  </div>
                </>
              )}
            </>
          )}

          {(selected.type === 'bjt_npn' || selected.type === 'bjt_pnp') && (
            <>
              <PresetButtons
                presets={DEVICE_TYPES[selected.type].presets}
                value={selected.value}
                onSelect={(key) => updateComponentValue(selected.id, key)}
              />
              {deviceInfo && (
                <>
                  <div className="reading">region: {deviceInfo.region}</div>
                  <div className="reading">
                    Ib {formatCurrent(deviceInfo.ib)} &middot; Ic {formatCurrent(deviceInfo.ic)} &middot; Ie {formatCurrent(deviceInfo.ie)}
                  </div>
                  <div className="reading">Vbe {formatVoltage(deviceInfo.vbe)} &middot; Vce {formatVoltage(deviceInfo.vce)}</div>
                  <div className="reading" style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                    small-signal: gm {formatSiemens(deviceInfo.gm)} &middot; r&pi; {formatOhms(deviceInfo.rpi)} &middot; ro {formatOhms(deviceInfo.ro)}
                  </div>
                </>
              )}
            </>
          )}

          {(selected.type === 'mosfet_n' || selected.type === 'mosfet_p') && (
            <>
              <PresetButtons
                presets={DEVICE_TYPES[selected.type].presets}
                value={selected.value}
                onSelect={(key) => updateComponentValue(selected.id, key)}
              />
              {deviceInfo && (
                <>
                  <div className="reading">region: {deviceInfo.region}</div>
                  <div className="reading">Id {formatCurrent(deviceInfo.id)}</div>
                  <div className="reading">Vgs {formatVoltage(deviceInfo.vgs)} &middot; Vds {formatVoltage(deviceInfo.vds)}</div>
                  <div className="reading" style={{ color: 'var(--text-dim)', fontSize: '11px' }}>
                    small-signal: gm {formatSiemens(deviceInfo.gm)} &middot; ro {formatOhms(deviceInfo.ro)}
                  </div>
                </>
              )}
            </>
          )}

          {selected.type === 'function_gen' && (
            <>
              <div className="preset-row">
                {WAVEFORM_PRESETS.map((w) => (
                  <button key={w} className={`preset-chip ${selected.value.waveform === w ? 'is-active' : ''}`}
                    onClick={() => updateComponentValue(selected.id, { ...selected.value, waveform: w })}>
                    {w}
                  </button>
                ))}
              </div>
              <div className="preset-row">
                {FREQUENCY_PRESETS.map((f) => (
                  <button key={f} className={`preset-chip ${selected.value.freqHz === f ? 'is-active' : ''}`}
                    onClick={() => updateComponentValue(selected.id, { ...selected.value, freqHz: f })}>
                    {formatFrequency(f)}
                  </button>
                ))}
              </div>
              <div className="preset-row">
                {AMPLITUDE_PRESETS.map((a) => (
                  <button key={a} className={`preset-chip ${selected.value.amplitudeV === a ? 'is-active' : ''}`}
                    onClick={() => updateComponentValue(selected.id, { ...selected.value, amplitudeV: a })}>
                    ±{a}V
                  </button>
                ))}
              </div>
              <div className="preset-row">
                {OFFSET_PRESETS.map((o) => (
                  <button key={o} className={`preset-chip ${selected.value.offsetV === o ? 'is-active' : ''}`}
                    onClick={() => updateComponentValue(selected.id, { ...selected.value, offsetV: o })}>
                    {o}V offset
                  </button>
                ))}
              </div>
              <div className="reading">
                {selected.value.waveform}, {formatFrequency(selected.value.freqHz)}, &plusmn;{selected.value.amplitudeV}V around {selected.value.offsetV}V
              </div>
            </>
          )}

          {selected.type === 'probe' && (
            <div className="reading">
              <span className="channel-swatch" style={{ background: channelColorForIndex(probeIndex) }} />
              channel {probeIndex + 1} &middot; zero-current voltmeter
            </div>
          )}

          {current !== null && ![...TRANSISTOR_TYPES, 'motor', 'servo', 'probe'].includes(selected.type) && (
            <div className="reading">current: {formatCurrent(current)}</div>
          )}

          <button className="remove-button" onClick={() => removeElement(selected.id)}>Remove</button>
        </div>
      ) : (
        <p className="empty-hint">Select a component on the board to edit its value.</p>
      )}

      <h3 className="panel-subtitle">Netlist</h3>
      <ul className="netlist-list">
        {wires.map((w) => (
          <li key={w.id}>wire &nbsp; {w.fromHole} &ndash; {w.toHole}</li>
        ))}
        {components.map((c) => (
          <li key={c.id} className={selectedId === c.id ? 'is-selected' : ''}>
            {c.type} &nbsp; {Object.values(c.holes).join(' – ')}
            {c.type === 'resistor'  && ` (${formatOhms(c.value)})`}
            {c.type === 'battery'   && ` (${c.value}V)`}
            {c.type === 'capacitor' && ` (${formatFarads(c.value)})`}
            {c.type === 'inductor'  && ` (${formatHenry(c.value)})`}
            {c.type === 'motor'     && ` (${formatOhms(c.value)} winding)`}
            {c.type === 'servo'     && ` (${formatOhms(c.value)} load)`}
            {TRANSISTOR_TYPES.includes(c.type) && ` (${DEVICE_TYPES[c.type].presets[c.value]?.label ?? c.value})`}
            {c.type === 'function_gen' && ` (${c.value.waveform}, ${formatFrequency(c.value.freqHz)}, ±${c.value.amplitudeV}V @ ${c.value.offsetV}V)`}
            {c.type === 'probe' && ` (ch ${components.filter((x) => x.type === 'probe').findIndex((x) => x.id === c.id) + 1})`}
          </li>
        ))}
        {wires.length === 0 && components.length === 0 && (
          <li className="empty-hint">Nothing placed yet.</li>
        )}
      </ul>
      </>
      )}
    </aside>
  );
}
