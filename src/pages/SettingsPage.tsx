import { useRef, useState } from 'react';
import { ChevronRight, Database, Download, HardDrive, Info, Ruler, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AppData, ExportBundle } from '../types';
import { useAppStore } from '../store/appStore';
import { toast } from '../store/toastStore';
import { readLegacyBackup } from '../data/migration';
import { PageHeader } from '../components/PageHeader';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';

function downloadJson(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function SettingsPage() {
  const navigate = useNavigate();
  const activities = useAppStore((state) => state.activities);
  const programs = useAppStore((state) => state.programs);
  const sessions = useAppStore((state) => state.sessions);
  const activeSession = useAppStore((state) => state.activeSession);
  const settings = useAppStore((state) => state.settings);
  const seedVersion = useAppStore((state) => state.seedVersion);
  const hasLegacyBackup = useAppStore((state) => state.hasLegacyBackup);
  const setWeightUnit = useAppStore((state) => state.setWeightUnit);
  const importData = useAppStore((state) => state.importData);
  const resetData = useAppStore((state) => state.resetData);
  const [unitsOpen, setUnitsOpen] = useState(false);
  const [backupOpen, setBackupOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<ExportBundle | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const currentData = (): AppData => ({
    activities,
    programs,
    sessions,
    activeSession,
    settings,
    seedVersion,
    hasLegacyBackup,
  });

  const exportBackup = () => {
    const bundle: ExportBundle = {
      app: 'form-fitness',
      version: 1,
      exportedAt: new Date().toISOString(),
      data: currentData(),
    };
    downloadJson(`form-fitness-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(bundle, null, 2));
    toast('Backup downloaded.', 'success');
  };

  const downloadLegacy = () => {
    const raw = readLegacyBackup();
    if (!raw) {
      toast('No legacy backup is available.', 'error');
      return;
    }
    downloadJson(`form-fitness-legacy-backup-${new Date().toISOString().slice(0, 10)}.json`, raw);
    toast('Legacy backup downloaded.', 'success');
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ExportBundle;
      if (
        !parsed ||
        parsed.app !== 'form-fitness' ||
        parsed.version !== 1 ||
        !parsed.data ||
        !Array.isArray(parsed.data.activities) ||
        !Array.isArray(parsed.data.programs) ||
        !Array.isArray(parsed.data.sessions)
      ) {
        throw new Error('That is not a valid Form Fitness backup.');
      }
      setPendingImport(parsed);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Could not read that backup.', 'error');
    }
  };

  return (
    <div className="page page--settings">
      <PageHeader title="Settings" backTo={-1} settings={false} />

      <div className="settings-list">
        <button type="button" className="settings-row" onClick={() => setUnitsOpen(true)}>
          <span className="settings-row__icon"><Ruler size={21} /></span>
          <span className="settings-row__copy"><strong>Units</strong><small>{settings.weightUnit === 'kg' ? 'kg, minutes/seconds' : 'lb, minutes/seconds'}</small></span>
          <ChevronRight size={18} />
        </button>
        <button type="button" className="settings-row" onClick={() => setBackupOpen(true)}>
          <span className="settings-row__icon"><HardDrive size={21} /></span>
          <span className="settings-row__copy"><strong>Backup &amp; Restore</strong><small>Export or import your data</small></span>
          <ChevronRight size={18} />
        </button>
        <button type="button" className="settings-row" onClick={() => setDataOpen(true)}>
          <span className="settings-row__icon"><Database size={21} /></span>
          <span className="settings-row__copy"><strong>Data Management</strong><small>Reset or clear data</small></span>
          <ChevronRight size={18} />
        </button>
        <button type="button" className="settings-row" onClick={() => setAboutOpen(true)}>
          <span className="settings-row__icon"><Info size={21} /></span>
          <span className="settings-row__copy"><strong>About</strong><small>App version and information</small></span>
          <ChevronRight size={18} />
        </button>
      </div>

      <Modal open={unitsOpen} onClose={() => setUnitsOpen(false)} title="Units" subtitle="Choose how weights and speed are shown.">
        <div className="segmented">
          <button type="button" className={settings.weightUnit === 'kg' ? 'is-active' : ''} onClick={() => setWeightUnit('kg')}>kg · km/h</button>
          <button type="button" className={settings.weightUnit === 'lb' ? 'is-active' : ''} onClick={() => setWeightUnit('lb')}>lb · mph</button>
        </div>
        <p className="muted small">Durations are always displayed in minutes and seconds. Stored values are converted safely when you switch units.</p>
      </Modal>

      <Modal
        open={backupOpen}
        onClose={() => setBackupOpen(false)}
        title="Backup & Restore"
        subtitle="Keep a copy of your programmes, history and images."
      >
        <div className="settings-action-list">
          <button type="button" className="settings-action" onClick={exportBackup}>
            <Download size={18} />
            <span><strong>Export backup</strong><small>Download a JSON file with all app data.</small></span>
          </button>
          <button type="button" className="settings-action" onClick={() => fileRef.current?.click()}>
            <Upload size={18} />
            <span><strong>Import backup</strong><small>Replace app data with a saved backup.</small></span>
          </button>
          {hasLegacyBackup && (
            <button type="button" className="settings-action" onClick={downloadLegacy}>
              <HardDrive size={18} />
              <span><strong>Download legacy backup</strong><small>Raw data from the previous Form Fitness app.</small></span>
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            void handleImportFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
        <p className="muted small">Imports are validated and replace the current data only after confirmation. Export first if you are unsure.</p>
      </Modal>

      <Modal open={dataOpen} onClose={() => setDataOpen(false)} title="Data Management" subtitle="Local data on this device.">
        <p className="muted small">Your data is stored only on this device. Export a backup before clearing it.</p>
        <button type="button" className="button button--danger-ghost button--full" onClick={() => { setDataOpen(false); setResetOpen(true); }}>
          Reset all data
        </button>
      </Modal>

      <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} title="About Form Fitness" subtitle="Version 1.0 · local-first">
        <p className="about-copy">
          Form Fitness is a simple workout tracker for building programmes, logging sessions and seeing real progress.
          It has no account, no sync server and no analytics. Your data stays on this device unless you export it.
        </p>
        <p className="about-copy">
          Exercise photography is bundled locally. Sources and licences are recorded in the repository attribution file.
        </p>
        <p className="tiny muted">Built with React, Vite, TypeScript and Zustand.</p>
      </Modal>

      <ConfirmDialog
        open={Boolean(pendingImport)}
        title="Import this backup?"
        message="This will replace all current programmes, history, activities and settings. Export a backup first if you need the current data."
        confirmLabel="Replace with backup"
        danger
        onClose={() => setPendingImport(null)}
        onConfirm={() => {
          if (!pendingImport) return;
          importData(pendingImport.data);
          toast('Backup restored.', 'success');
          navigate('/');
        }}
      />

      <ConfirmDialog
        open={resetOpen}
        title="Reset all data?"
        message="This clears your programmes, history, custom activities and settings on this device, then restores the five example programmes. This cannot be undone."
        confirmLabel="Reset app data"
        danger
        onClose={() => setResetOpen(false)}
        onConfirm={() => {
          resetData();
          toast('App data reset.', 'success');
          navigate('/');
        }}
      />
    </div>
  );
}
