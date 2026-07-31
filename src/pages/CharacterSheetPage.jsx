import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import InventoryTab from './tabs/InventoryTab';
import GrimoireTab from './tabs/GrimoireTab';
import StatsTab from './tabs/StatsTab';
import EquipementTab from './tabs/EquipementTab';
import { useCharacterStore } from '../store/characterStore';
import { useAuthStore } from '../store/authStore';
import { useAdminStore } from '../store/adminStore';
import { RACES, ASCENDANCES, CLASSES, CLASS_NAMES, SOUS_CLASSES, SEXES, STAT_KEYS, RESISTANCES_DEF } from '../data/gameData';
import { statLabel } from '../domain/characterCalculations';

const TABS = ['Fiche', 'Stats', 'Inventaire', 'Équipement', 'Grimoire'];
const CREATE_TABS = [
  'Fiche',
  'Informations',
  'Stats',
  'Aptitudes & Connaissances',
  'Résistances',
  'Compétences & Actions',
  'Grimoire',
  'Équipement',
  'Inventaire',
];

function classDef(name) {
  return CLASSES.find((c) => c.nom === name) || CLASSES[0];
}

function emptyCharacter(userId) {
  const classe = CLASS_NAMES[0];
  const race = RACES[0];
  const def = classDef(classe);
  return {
    userId,
    nom: '',
    sexe: SEXES[0],
    race,
    ascendance: ASCENDANCES[race]?.[0] || '',
    classe,
    sousClasse: SOUS_CLASSES[classe]?.[0] || '',
    niveau: 1,
    chance: 0,
    naissance: '',
    provenance: '',
    origine: '',
    historique: '',
    maitrise: '',
    taille: '',
    poids: '',
    age: '',
    vie: { actuel: def.vie, max: def.vie },
    mana: { actuel: def.mana, max: def.mana },
    endu: { actuel: def.endu, max: def.endu },
    stats: { FOR: 10, DEX: 10, CON: 10, INT: 10, SAG: 10, CHA: 10 },
    competences: [],
    connaissances: [],
    langues: [],
    competencesInnees: {
      spécialeClasse: null,
      classe: [],
      race: [],
      ascendance: [],
      origine: [],
      historique: [],
      armement: [],
      equipement: [],
    },
    competencesSousClasse: [],
    inventaire: [],
    sorts: [],
    equipement: {},
    bourse: 0,
    notesEquipement: '',
    isBoss: false,
  };
}

export default function CharacterSheetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const getCharacter = useCharacterStore((s) => s.getCharacter);
  const getCharactersForUser = useCharacterStore((s) => s.getCharactersForUser);
  const setActive = useCharacterStore((s) => s.setActive);
  const addCharacter = useCharacterStore((s) => s.addCharacter);
  const user = useAuthStore((s) => s.user);
  const isCreating = id === 'new';
  const char = isCreating ? null : getCharacter(Number(id));
  const userChars = getCharactersForUser(user.id);

  const [tab, setTab] = useState('Fiche');

  if (isCreating) {
    return (
      <CharacterCreatePage
        userId={user.id}
        onCancel={() => navigate('/')}
        onCreate={async (character) => {
          const newId = await addCharacter(character);
          if (newId) navigate(`/character/${newId}`);
        }}
      />
    );
  }

  if (!char) {
    return (
      <div className="app-wrapper">
        <Header />
        <main><p style={{ color: 'var(--dim)' }}>Personnage introuvable.</p></main>
      </div>
    );
  }

  const switchChar = (charId) => {
    setActive(charId);
    navigate(`/character/${charId}`);
    setTab('Fiche');
  };

  return (
    <div className="app-wrapper">
      <Header title={char.nom} subtitle={`${char.classe} · ${char.race} · Niv. ${char.niveau}`} />

      {/* Character switcher */}
      {userChars.length > 1 && (
        <nav className="filters">
          <span className="filter-label">Personnage</span>
          {userChars.map((c) => (
            <button
              key={c.id}
              className={`filter-btn${c.id === char.id ? ' active' : ''}`}
              onClick={() => switchChar(c.id)}
            >
              {c.nom}
            </button>
          ))}
          <button className="filter-btn" style={{ marginLeft: 'auto' }} onClick={() => navigate('/')}>
            ← Retour
          </button>
        </nav>
      )}

      {/* Tab bar */}
      <div style={{ padding: '20px 16px 0', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        <div className="sheet-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              className={`sheet-tab${tab === t ? ' active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <main style={{ paddingTop: 0 }}>
        {tab === 'Fiche'        && <FicheTab char={char} />}
        {tab === 'Stats'        && <StatsTab char={char} />}
        {tab === 'Inventaire'   && <InventoryTab char={char} />}
        {tab === 'Équipement'   && <EquipementTab char={char} />}
        {tab === 'Grimoire'     && <GrimoireTab char={char} />}
      </main>

      <footer className="site-footer">✦ &nbsp; EINDHILL &nbsp; ✦</footer>
    </div>
  );
}

const POOL_CFG = [
  { key: 'vie',  label: 'Vie',       color: '#c84a4a' },
  { key: 'mana', label: 'Mana',      color: '#4a7ac8' },
  { key: 'endu', label: 'Endurance', color: '#4ac87a' },
];

function FicheTab({ char }) {
  return (
    <>
      {/* Resource pools */}
      <section>
        <h2 className="section-heading">Ressources</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {POOL_CFG.map(({ key, label, color }) => {
            const pool = char[key];
            const pct = pool.max > 0 ? (pool.actuel / pool.max) * 100 : 0;
            return (
              <div key={key} style={{
                background: '#1a1608',
                border: '1px solid #3a2e18',
                borderRadius: 3,
                padding: '16px 20px',
                minWidth: 140,
              }}>
                <div style={{ fontFamily: 'var(--font-caps)', fontSize: 12, letterSpacing: 3, color: 'var(--dim)', marginBottom: 8 }}>{label}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 900, color, lineHeight: 1 }}>
                  {pool.actuel}
                  <span style={{ fontSize: 18, color: 'var(--dim)', fontWeight: 400 }}> / {pool.max}</span>
                </div>
                <div style={{ marginTop: 8, height: 3, background: '#2a2318', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Competences */}
      {char.competences.length > 0 && (
        <section>
          <h2 className="section-heading">Capacités & Compétences</h2>
          <div className="grid">
            {char.competences.map((c, i) => (
              <div className="resource-card" key={i}>
                <div className="resource-header">
                  <div>
                    <div className="resource-name">{c.nom}</div>
                  </div>
                </div>
                <div className="resource-body">
                  <p style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.5 }}>{c.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function CharacterCreatePage({ userId, onCancel, onCreate }) {
  const [tab, setTab] = useState('Fiche');
  const [form, setForm] = useState(() => emptyCharacter(userId));
  const [error, setError] = useState('');
  const { customCaracteristiques } = useAdminStore();
  const caracsDef = [...(customCaracteristiques || [])].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

  const patch = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const patchPool = (key, field, value) => {
    const n = Number(value) || 0;
    setForm((f) => ({ ...f, [key]: { ...f[key], [field]: n } }));
  };
  const patchStat = (key, value) => {
    const n = Number(value) || 0;
    setForm((f) => ({ ...f, stats: { ...f.stats, [key]: n } }));
  };
  const patchLine = (group, index, field, value) => {
    setForm((f) => ({
      ...f,
      [group]: f[group].map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
  };
  const addLine = (group, item) => setForm((f) => ({ ...f, [group]: [...f[group], item] }));
  const removeLine = (group, index) => {
    setForm((f) => ({ ...f, [group]: f[group].filter((_, i) => i !== index) }));
  };

  const changeRace = (race) => {
    setForm((f) => ({
      ...f,
      race,
      ascendance: ASCENDANCES[race]?.[0] || '',
    }));
  };

  const changeClasse = (classe) => {
    const def = classDef(classe);
    setForm((f) => ({
      ...f,
      classe,
      sousClasse: SOUS_CLASSES[classe]?.[0] || '',
      vie: { actuel: def.vie, max: def.vie },
      mana: { actuel: def.mana, max: def.mana },
      endu: { actuel: def.endu, max: def.endu },
    }));
  };

  const submit = () => {
    if (!form.nom.trim()) {
      setError('Nom du personnage requis.');
      return;
    }
    setError('');
    onCreate({ ...form, nom: form.nom.trim(), niveau: Number(form.niveau) || 1 });
  };

  return (
    <div className="app-wrapper">
      <Header title="Nouveau personnage" subtitle="Création de fiche" />

      <div className="create-shell">
        <div className="create-topbar">
          <div className="sheet-tabs">
            {CREATE_TABS.map((t) => (
              <button
                key={t}
                className={`sheet-tab${tab === t ? ' active' : ''}`}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="create-actions">
            <button className="btn-ghost" onClick={onCancel}>Annuler</button>
            <button className="btn-primary create-save" onClick={submit}>Créer</button>
          </div>
        </div>

        {error && <div className="form-error create-error">{error}</div>}

        <main className="create-panel">
          {tab === 'Fiche' && (
            <>
              <CreateSection title="Informations générales">
                <CreateField label="Nom"><input value={form.nom} onChange={(e) => patch('nom', e.target.value)} /></CreateField>
                <CreateField label="Race">
                  <select value={form.race} onChange={(e) => changeRace(e.target.value)}>
                    {RACES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </CreateField>
                <CreateField label="Ascendance">
                  <select value={form.ascendance} onChange={(e) => patch('ascendance', e.target.value)}>
                    {(ASCENDANCES[form.race] || []).map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </CreateField>
                <CreateField label="Sexe">
                  <select value={form.sexe} onChange={(e) => patch('sexe', e.target.value)}>
                    {SEXES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </CreateField>
                <CreateField label="Classe">
                  <select value={form.classe} onChange={(e) => changeClasse(e.target.value)}>
                    {CLASS_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </CreateField>
                <CreateField label="Sous-classe">
                  <select value={form.sousClasse} onChange={(e) => patch('sousClasse', e.target.value)}>
                    {(SOUS_CLASSES[form.classe] || ['']).map((s) => <option key={s} value={s}>{s || '—'}</option>)}
                  </select>
                </CreateField>
                <CreateField label="Niveau"><input type="number" min="1" value={form.niveau} onChange={(e) => patch('niveau', e.target.value)} /></CreateField>
                <CreateField label="Chance"><input type="number" value={form.chance} onChange={(e) => patch('chance', Number(e.target.value) || 0)} /></CreateField>
              </CreateSection>

              <CreateSection title="Origine et contexte">
                {['naissance', 'provenance', 'origine', 'historique', 'maitrise', 'taille', 'poids', 'age'].map((field) => (
                  <CreateField key={field} label={field}>
                    <input value={form[field]} onChange={(e) => patch(field, e.target.value)} />
                  </CreateField>
                ))}
              </CreateSection>
            </>
          )}

          {tab === 'Stats' && (
            <>
              <CreateSection title="Ressources">
                {[
                  ['vie', 'Vitalité'],
                  ['mana', 'Maîtrise'],
                  ['endu', 'Endurance'],
                ].map(([key, label]) => (
                  <CreatePool key={key} label={label} pool={form[key]} onChange={(field, value) => patchPool(key, field, value)} />
                ))}
              </CreateSection>
              <CreateSection title="Caractéristiques">
                {caracsDef.map((carac) => (
                  <CreateField key={carac.cle} label={carac.nom}>
                    <input type="number" value={form.stats[carac.cle] ?? 10} onChange={(e) => patchStat(carac.cle, e.target.value)} />
                  </CreateField>
                ))}
              </CreateSection>
            </>
          )}

          {tab === 'Connaissances' && (
            <>
              <CreateList
                title="Connaissances"
                rows={form.connaissances}
                columns={[['nom', 'Connaissance'], ['bonus', 'Bonus']]}
                onAdd={() => addLine('connaissances', { nom: '', bonus: '' })}
                onChange={(i, field, value) => patchLine('connaissances', i, field, value)}
                onRemove={(i) => removeLine('connaissances', i)}
              />
              <CreateList
                title="Langues"
                rows={form.langues}
                columns={[['nom', 'Langue'], ['type', 'Source'], ['bonus', 'Bonus']]}
                onAdd={() => addLine('langues', { nom: '', type: '', bonus: '' })}
                onChange={(i, field, value) => patchLine('langues', i, field, value)}
                onRemove={(i) => removeLine('langues', i)}
              />
            </>
          )}

          {tab === 'Compétences' && (
            <CreateList
              title="Capacités & compétences"
              rows={form.competences}
              columns={[['nom', 'Nom'], ['desc', 'Description']]}
              onAdd={() => addLine('competences', { nom: '', desc: '' })}
              onChange={(i, field, value) => patchLine('competences', i, field, value)}
              onRemove={(i) => removeLine('competences', i)}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function CreateSection({ title, children }) {
  return (
    <section className="create-section">
      <h2>{title}</h2>
      <div className="create-grid">{children}</div>
    </section>
  );
}

function CreateField({ label, children }) {
  return (
    <label className="create-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function CreatePool({ label, pool, onChange }) {
  return (
    <div className="create-pool">
      <strong>{label}</strong>
      <label><span>Actuel</span><input type="number" value={pool.actuel} onChange={(e) => onChange('actuel', e.target.value)} /></label>
      <label><span>Max</span><input type="number" value={pool.max} onChange={(e) => onChange('max', e.target.value)} /></label>
    </div>
  );
}

function CreateList({ title, rows, columns, onAdd, onChange, onRemove }) {
  return (
    <section className="create-section">
      <div className="create-list-head">
        <h2>{title}</h2>
        <button className="btn-ghost" onClick={onAdd}>Ajouter</button>
      </div>
      <div className="create-list">
        <div className="create-list-row create-list-row--head" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) 42px` }}>
          {columns.map(([, label]) => <span key={label}>{label}</span>)}
          <span />
        </div>
        {rows.map((row, index) => (
          <div className="create-list-row" key={index} style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr)) 42px` }}>
            {columns.map(([field]) => (
              <input key={field} value={row[field] || ''} onChange={(e) => onChange(index, field, e.target.value)} />
            ))}
            <button className="btn-danger" onClick={() => onRemove(index)}>×</button>
          </div>
        ))}
      </div>
    </section>
  );
}
