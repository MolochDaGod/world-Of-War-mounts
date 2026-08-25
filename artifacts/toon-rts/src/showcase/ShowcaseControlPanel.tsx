import React from 'react';
import {
  ArrowLeft, Camera, Video, Sun,
  Square, Aperture, Layers, Target, Gauge, Maximize
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Subject {
  id: string;
  name: string;
}

export interface SubjectGroup {
  id: string;
  name: string;
  subjects: Subject[];
}

export interface Shot {
  id: string;
  name: string;
}

export interface EditorValues {
  cameraDistance: number;
  cameraHeight: number;
  lightIntensity: number;
}

export interface ShowcaseControlPanelProps {
  subjectGroups: SubjectGroup[];
  selectedSubjectId: string;
  selectedShotId: string;
  shotList: Shot[];
  editorValues: EditorValues;
  isBusy?: boolean;
  isRecording?: boolean;
  status?: string;
  onSelectSubject: (id: string) => void;
  onSelectShot: (id: string) => void;
  onChangeEditorValue: (key: keyof EditorValues, value: number) => void;
  onCaptureScreenshot: () => void;
  onToggleRecord: () => void;
  onReturn: () => void;
}

const styles = `
  .tactical-slider {
    -webkit-appearance: none;
    appearance: none;
    background: transparent;
  }
  .tactical-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 8px;
    height: 16px;
    background: #e8c060;
    cursor: pointer;
    border-radius: 1px;
    box-shadow: 0 0 10px rgba(232,192,96,0.6);
    transition: all 0.2s;
    margin-top: -7px;
  }
  .tactical-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
    background: #fff;
    box-shadow: 0 0 12px rgba(255,255,255,0.8);
  }
  .tactical-slider::-webkit-slider-runnable-track {
    background: rgba(255,255,255,0.15);
    height: 2px;
    border-radius: 1px;
  }
  .tactical-slider::-moz-range-thumb {
    width: 8px;
    height: 16px;
    background: #e8c060;
    cursor: pointer;
    border-radius: 1px;
    box-shadow: 0 0 10px rgba(232,192,96,0.6);
    transition: all 0.2s;
    border: none;
  }
  .tactical-slider::-moz-range-track {
    background: rgba(255,255,255,0.15);
    height: 2px;
    border-radius: 1px;
  }
  .tactical-btn:hover {
    background: rgba(255,255,255,0.1) !important;
    border-color: rgba(255,255,255,0.3) !important;
  }
  .pulse-border {
    animation: pulseBorder 2s infinite;
  }
  @keyframes pulseBorder {
    0% { box-shadow: 0 0 0 0 rgba(224,48,48,0.4); }
    70% { box-shadow: 0 0 0 10px rgba(224,48,48,0); }
    100% { box-shadow: 0 0 0 0 rgba(224,48,48,0); }
  }
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0,0,0,0.2);
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.15);
    border-radius: 2px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(232,192,96,0.5);
  }
  .scanline {
    width: 100%;
    height: 100px;
    background: linear-gradient(0deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.03) 50%, rgba(0,0,0,0) 100%);
    opacity: 0.1;
    position: absolute;
    bottom: 100%;
    animation: scanline 8s linear infinite;
    pointer-events: none;
    z-index: 0;
  }
  @keyframes scanline {
    0% { bottom: 100%; }
    100% { bottom: -100px; }
  }
`;

interface TacticalSliderProps {
  label: string;
  icon: LucideIcon;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}

const TacticalSlider = ({ label, icon: Icon, value, min, max, step, onChange, format = (v: number) => v.toFixed(1) }: TacticalSliderProps) => {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 10, color: '#8a8e99', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon size={12} />
          {label}
        </div>
        <span style={{ color: '#e8c060', fontFamily: 'monospace' }}>{format(value)}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', outline: 'none' }}
        className="tactical-slider"
      />
    </div>
  );
};

const Panel = ({ children, style = {}, className = "" }: { children: React.ReactNode, style?: React.CSSProperties, className?: string }) => (
  <div className={`relative ${className}`} style={{
    background: 'linear-gradient(135deg, rgba(12,15,22,0.85) 0%, rgba(6,8,12,0.95) 100%)',
    border: '1px solid rgba(232,192,96,0.15)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.02)',
    backdropFilter: 'blur(16px)',
    overflow: 'hidden',
    ...style
  }}>
    <div className="scanline" />
    {/* Corner brackets */}
    <div style={{ position: 'absolute', top: -1, left: -1, width: 6, height: 6, borderTop: '2px solid #e8c060', borderLeft: '2px solid #e8c060', opacity: 0.8 }} />
    <div style={{ position: 'absolute', top: -1, right: -1, width: 6, height: 6, borderTop: '2px solid #e8c060', borderRight: '2px solid #e8c060', opacity: 0.8 }} />
    <div style={{ position: 'absolute', bottom: -1, left: -1, width: 6, height: 6, borderBottom: '2px solid #e8c060', borderLeft: '2px solid #e8c060', opacity: 0.8 }} />
    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 6, height: 6, borderBottom: '2px solid #e8c060', borderRight: '2px solid #e8c060', opacity: 0.8 }} />
    
    <div style={{ position: 'relative', zIndex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {children}
    </div>
  </div>
);

export function ShowcaseControlPanel({
  subjectGroups,
  selectedSubjectId,
  selectedShotId,
  shotList,
  editorValues,
  isBusy = false,
  isRecording = false,
  status = 'SYS_READY',
  onSelectSubject,
  onSelectShot,
  onChangeEditorValue,
  onCaptureScreenshot,
  onToggleRecord,
  onReturn,
}: ShowcaseControlPanelProps) {
  return (
    <>
      <style>{styles}</style>
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 32px',
        zIndex: 100,
        fontFamily: "'Inter', sans-serif"
      }}>
        {/* TOP BAR */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'auto',
          marginBottom: 24
        }}>
          <button
            onClick={onReturn}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(10,12,16,0.8)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#f0e8d5',
              padding: '8px 16px',
              fontFamily: "'Cinzel', serif",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#e8c060';
              e.currentTarget.style.color = '#e8c060';
              e.currentTarget.style.boxShadow = '0 0 16px rgba(232,192,96,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = '#f0e8d5';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <ArrowLeft size={16} />
            RETURN TO BASE
          </button>

          <div style={{
            background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(232,192,96,0.3)',
            padding: '6px 16px',
            color: isRecording ? '#e03030' : '#e8c060',
            fontFamily: 'monospace',
            fontSize: 12,
            letterSpacing: '0.2em',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: isRecording ? '0 0 12px rgba(224,48,48,0.4)' : '0 0 12px rgba(232,192,96,0.15)',
            backdropFilter: 'blur(8px)',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: isRecording ? '#e03030' : '#e8c060',
              boxShadow: `0 0 8px ${isRecording ? '#e03030' : '#e8c060'}`
            }} className={isRecording ? 'pulse-border' : ''} />
            [ {status} ]
          </div>
        </div>

        {/* PANELS CONTAINER */}
        <div style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          pointerEvents: 'none'
        }}>

          {/* LEFT PANEL: Subjects */}
          <Panel style={{ width: 280, pointerEvents: 'auto', padding: 20 }}>
            <div style={{
              fontFamily: "'Cinzel', serif",
              color: '#e8c060',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.15em',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textShadow: '0 0 12px rgba(232,192,96,0.4)'
            }}>
              <Layers size={18} />
              ASSET ROSTER
            </div>

            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: 8, display: 'flex', flexDirection: 'column', gap: 20 }}>
              {subjectGroups.map(group => (
                <div key={group.id}>
                  <div style={{
                    fontSize: 10,
                    color: '#8a8e99',
                    letterSpacing: '0.2em',
                    textTransform: 'uppercase',
                    marginBottom: 10,
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    {group.name}
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{group.subjects.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {group.subjects.map(subject => {
                      const isSelected = selectedSubjectId === subject.id;
                      return (
                        <button
                          key={subject.id}
                          onClick={() => onSelectSubject(subject.id)}
                          style={{
                            textAlign: 'left',
                            padding: '8px 12px',
                            fontSize: 12,
                            fontFamily: 'monospace',
                            letterSpacing: '0.05em',
                            background: isSelected ? 'rgba(232,192,96,0.1)' : 'rgba(0,0,0,0.2)',
                            borderLeft: `2px solid ${isSelected ? '#e8c060' : 'rgba(255,255,255,0.05)'}`,
                            color: isSelected ? '#e8c060' : '#a0a5b5',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            textShadow: isSelected ? '0 0 8px rgba(232,192,96,0.4)' : 'none'
                          }}
                          onMouseEnter={(e) => {
                            if(!isSelected) {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                              e.currentTarget.style.color = '#fff';
                              e.currentTarget.style.borderLeftColor = 'rgba(255,255,255,0.2)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if(!isSelected) {
                              e.currentTarget.style.background = 'rgba(0,0,0,0.2)';
                              e.currentTarget.style.color = '#a0a5b5';
                              e.currentTarget.style.borderLeftColor = 'rgba(255,255,255,0.05)';
                            }
                          }}
                        >
                          {subject.name}
                          {isSelected && <Target size={12} style={{ opacity: 0.6 }} />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* RIGHT PANEL: Controls */}
          <Panel style={{ width: 300, pointerEvents: 'auto', padding: 20 }}>
            <div style={{
              fontFamily: "'Cinzel', serif",
              color: '#e8c060',
              fontSize: 18,
              fontWeight: 700,
              letterSpacing: '0.15em',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textShadow: '0 0 12px rgba(232,192,96,0.4)'
            }}>
              <Aperture size={18} />
              DIRECTOR
            </div>

            <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', paddingRight: 8, display: 'flex', flexDirection: 'column' }}>

              {/* SHOT SELECTION */}
              <div style={{ marginBottom: 28 }}>
                <div style={{
                  fontSize: 10,
                  color: '#8a8e99',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <Camera size={12} />
                  CAMERA SHOT
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {shotList.map(shot => {
                    const isSelected = selectedShotId === shot.id;
                    return (
                      <button
                        key={shot.id}
                        onClick={() => onSelectShot(shot.id)}
                        style={{
                          padding: '10px 8px',
                          fontSize: 10,
                          fontWeight: 600,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          background: isSelected ? 'rgba(232,192,96,0.15)' : 'rgba(0,0,0,0.3)',
                          border: `1px solid ${isSelected ? '#e8c060' : 'rgba(255,255,255,0.1)'}`,
                          color: isSelected ? '#e8c060' : '#8a8e99',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: isSelected ? '0 0 12px rgba(232,192,96,0.2)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if(!isSelected) {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
                            e.currentTarget.style.color = '#fff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if(!isSelected) {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.color = '#8a8e99';
                          }
                        }}
                      >
                        {shot.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* EDITOR SLIDERS */}
              <div style={{ marginBottom: 24, padding: '16px 12px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                <div style={{
                  fontSize: 10,
                  color: '#8a8e99',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <Gauge size={12} />
                  ENVIRONMENT
                </div>

                <TacticalSlider
                  label="DISTANCE"
                  icon={Maximize}
                  value={editorValues.cameraDistance}
                  min={1} max={50} step={0.5}
                  onChange={(v) => onChangeEditorValue('cameraDistance', v)}
                />
                <TacticalSlider
                  label="HEIGHT"
                  icon={Layers}
                  value={editorValues.cameraHeight}
                  min={0} max={20} step={0.5}
                  onChange={(v) => onChangeEditorValue('cameraHeight', v)}
                />
                <TacticalSlider
                  label="LIGHT INTENSITY"
                  icon={Sun}
                  value={editorValues.lightIntensity}
                  min={0} max={5} step={0.1}
                  onChange={(v) => onChangeEditorValue('lightIntensity', v)}
                />
              </div>

              {/* ACTIONS */}
              <div style={{ marginTop: 'auto', display: 'flex', gap: 12 }}>
                <button
                  onClick={onCaptureScreenshot}
                  disabled={isBusy}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    background: 'rgba(0,0,0,0.4)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    cursor: isBusy ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    opacity: isBusy ? 0.5 : 1,
                    transition: 'all 0.2s',
                  }}
                  className="tactical-btn"
                >
                  <Camera size={16} />
                  CAPTURE
                </button>
                <button
                  onClick={onToggleRecord}
                  disabled={isBusy && !isRecording}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    background: isRecording ? 'rgba(224,48,48,0.15)' : 'rgba(0,0,0,0.4)',
                    border: `1px solid ${isRecording ? '#e03030' : 'rgba(255,255,255,0.15)'}`,
                    color: isRecording ? '#e03030' : '#fff',
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    cursor: (isBusy && !isRecording) ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    opacity: (isBusy && !isRecording) ? 0.5 : 1,
                    transition: 'all 0.2s',
                    boxShadow: isRecording ? '0 0 16px rgba(224,48,48,0.3)' : 'none'
                  }}
                  className={isRecording ? 'pulse-border' : 'tactical-btn'}
                >
                  {isRecording ? <Square size={16} fill="currentColor" /> : <Video size={16} />}
                  {isRecording ? 'STOP REC' : 'RECORD'}
                </button>
              </div>

            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
