import { useState } from 'react';
import { useAdminStore } from '../../../store/adminStore';
import { ConfirmModal } from '../AdminShared';
import {
  asArray,
  BLANK_LEVEL_RULE,
  normalizeLevelRule,
} from '../adminUtils';

const CLASS_DATA = [];

export default function LevelingPanel() {
  const customLevelRules = useAdminStore((state) => state.customLevelRules || []);
  const customClasses = useAdminStore((state) => state.customClasses || []);
  const addLevelRule = useAdminStore((state) => state.addLevelRule);
  const updateLevelRule = useAdminStore((state) => state.updateLevelRule);
  const deleteLevelRuleFromLevel = useAdminStore((state) => state.deleteLevelRuleFromLevel);

  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState(BLANK_LEVEL_RULE);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const sortedRules = [...asArray(customLevelRules)].sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0));

  const getProgressBeforeLevel = (level, ignoreId = null) => {
    const previousRules = sortedRules.filter((rule) => {
      if (ignoreId && rule.id === ignoreId) return false;
      return (Number(rule.level) || 0) < (Number(level) || 0);
    });
    return {
      classUnlocked: previousRules.some((rule) => rule.unlockClass),
      subclassUnlocked: previousRules.some((rule) => rule.unlockSubclass),
      maitriseUnlocked: previousRules.some((rule) => rule.unlockMaitrise),
      previous: previousRules[previousRules.length - 1] || null,
    };
  };

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const formProgress = getProgressBeforeLevel(form.level, editingRule?.id);
  const isLevelZero = Number(form.level) === 0;
  const canConfigureClassUnlock = !isLevelZero && (Boolean(form.unlockClass) || !formProgress.classUnlocked);
  const canConfigureSubclassUnlock = !isLevelZero && (Boolean(form.unlockSubclass) || !formProgress.subclassUnlocked);
  const canConfigureMaitriseUnlock = !isLevelZero && (Boolean(form.unlockMaitrise) || !formProgress.maitriseUnlocked);

  const classOptions = [
    ...CLASS_DATA.map((c) => c.nom),
    ...asArray(customClasses).map((c) => c.nom),
  ].filter(Boolean);

  const startCreate = () => {
    setEditingRule(null);
    const nextLevel = sortedRules.length > 0 ? Math.max(...sortedRules.map((r) => Number(r.level) || 0)) + 1 : 0;
    const progress = getProgressBeforeLevel(nextLevel);
    setForm({
      ...BLANK_LEVEL_RULE,
      level: nextLevel,
      title: nextLevel === 0 ? 'Création du personnage' : `Niveau ${nextLevel}`,
      summary: nextLevel === 0 ? 'Classe de départ et points initiaux.' : 'Montée de niveau depuis le palier précédent.',
      baseClass: sortedRules[0]?.baseClass || 'Explorateur',
      _classAlreadyUnlocked: progress.classUnlocked,
      _subclassAlreadyUnlocked: progress.subclassUnlocked,
      _maitriseAlreadyUnlocked: progress.maitriseUnlocked,
    });
    setShowForm(true);
  };

  const startEdit = (rule) => {
    setEditingRule(rule);
    setForm(normalizeLevelRule(rule));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setForm(BLANK_LEVEL_RULE);
  };

  const save = () => {
    const title = form.title.trim() || `Niveau ${Number(form.level) || 0}`;
    const { _classAlreadyUnlocked, _subclassAlreadyUnlocked, _maitriseAlreadyUnlocked, ...cleanForm } = form;
    const payload = {
      ...cleanForm,
      level: Number(form.level) || 0,
      title,
      key: form.key || `level-${Number(form.level) || 0}`,
      baseClass: isLevelZero ? (form.baseClass || 'Explorateur') : (sortedRules[0]?.baseClass || 'Explorateur'),
      characterPoints: Number(form.characterPoints) || 0,
      unlockClass: canConfigureClassUnlock ? Boolean(form.unlockClass) : false,
      unlockSubclass: canConfigureSubclassUnlock ? Boolean(form.unlockSubclass) : false,
      unlockMaitrise: canConfigureMaitriseUnlock ? Boolean(form.unlockMaitrise) : false,
    };
    if (editingRule) updateLevelRule(editingRule.id, payload);
    else addLevelRule(payload);
    closeForm();
  };

  const requestDelete = (rule) => {
    const level = Number(rule.level) || 0;
    const deletedCount = sortedRules.filter((item) => (Number(item.level) || 0) >= level).length;
    setConfirmDelete({
      title: 'Supprimer un palier',
      message: deletedCount > 1
        ? `Supprimer le niveau ${level} et les ${deletedCount - 1} niveau(x) suivant(s) ?`
        : `Supprimer le niveau ${level} ?`,
      dangerLabel: 'Supprimer',
      onConfirm: () => {
        deleteLevelRuleFromLevel(level);
        if ((Number(form.level) || 0) >= level) closeForm();
      },
    });
  };

  return (
    <div className="admin-panel leveling-panel">
      <div className="admin-panel-actions">
        <button className="admin-btn admin-btn--add" onClick={startCreate}>
          {sortedRules.length === 0 ? '+ Créer le niveau 0' : `+ Ajouter le niveau ${Math.max(...sortedRules.map((r) => Number(r.level) || 0)) + 1}`}
        </button>
      </div>

      {sortedRules.length === 0 ? (
        <div className="admin-placeholder">
          <div className="admin-placeholder-icon">LV</div>
          <p className="admin-placeholder-title">Aucun niveau défini</p>
          <p className="admin-placeholder-sub">Commence par créer le niveau 0 avec la classe de départ.</p>
        </div>
      ) : (
        <div className="entry-card-grid entry-card-grid--wide">
          {sortedRules.map((rule) => {
            const level = Number(rule.level) || 0;
            return (
              <div className="entry-card" key={rule.id || rule.key}>
                <div className="entry-card-top">
                  <div className="entry-card-badge">{level}</div>
                  <div className="entry-card-body">
                    <span className="entry-card-kicker">Palier — Niveau {level}</span>
                    <h3 className="entry-card-title">{rule.title || `Niveau ${level}`}</h3>
                  </div>
                </div>
                {rule.summary && <div className="entry-card-desc">{rule.summary}</div>}
                <div className="entry-card-tags">
                  {level === 0 && <span className="entry-card-tag">Classe de départ : {rule.baseClass || 'Explorateur'}</span>}
                  {level > 0 && <span className="entry-card-tag">Jet ressource 1d classe/sous-classe</span>}
                  {Number(rule.characterPoints) !== 0 && (
                    <span className="entry-card-tag">{Number(rule.characterPoints) > 0 ? '+' : ''}{rule.characterPoints} point(s) de carac</span>
                  )}
                  {rule.unlockClass && <span className="entry-card-tag">Déblocage classe</span>}
                  {rule.unlockSubclass && <span className="entry-card-tag">Déblocage sous-classe</span>}
                  {rule.unlockMaitrise && <span className="entry-card-tag">Déblocage maîtrise</span>}
                </div>
                <div className="entry-card-actions">
                  <button className="admin-btn" onClick={() => startEdit(rule)}>Modifier</button>
                  <button className="admin-btn admin-btn--danger" onClick={() => requestDelete(rule)}>Supprimer</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="index-modal-backdrop">
          <div className="index-modal index-modal--wide leveling-modal">
            <div className="index-modal-header">
              <h3>{editingRule ? 'Modifier un palier' : 'Nouveau palier'}</h3>
              <button className="admin-btn" onClick={closeForm}>✕ Fermer</button>
            </div>
            <div className="index-form leveling-form">
              <div className="comp-form-row">
                <div className="comp-form-field">
                  <label>Niveau *</label>
                  <input type="number" min="0" value={form.level} disabled />
                </div>
                <div className="comp-form-field comp-form-field--grow">
                  <label>Titre</label>
                  <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Ex: Création du personnage" />
                </div>
                <div className="comp-form-field">
                  <label>Points de carac</label>
                  <input type="number" value={form.characterPoints} onChange={(e) => set('characterPoints', e.target.value)} />
                </div>
              </div>

              <div className="comp-form-field">
                <label>Résumé du gain</label>
                <input value={form.summary} onChange={(e) => set('summary', e.target.value)} placeholder="Ex: Déblocage de la classe et choix de progression" />
              </div>

              {isLevelZero ? (
                <div className="leveling-start-class">
                  <div className="comp-form-field comp-form-field--grow">
                    <label>Classe de départ</label>
                    <select value={form.baseClass || 'Explorateur'} onChange={(e) => set('baseClass', e.target.value)}>
                      <option value="Explorateur">Explorateur</option>
                      {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="leveling-previous-note">
                    <strong>Base héritée du niveau précédent</strong>
                    <span>
                      Classe {formProgress.classUnlocked ? 'déjà débloquée' : 'non débloquée'}
                      {' · '}
                      Sous-classe {formProgress.subclassUnlocked ? 'déjà débloquée' : 'non débloquée'}
                      {' · '}
                      Maîtrise {formProgress.maitriseUnlocked ? 'déjà débloquée' : 'non débloquée'}
                    </span>
                  </div>
                  <div className="leveling-toggle-row">
                    {canConfigureClassUnlock ? (
                      <label className="index-value-toggle">
                        <input type="checkbox" checked={Boolean(form.unlockClass)} onChange={(e) => set('unlockClass', e.target.checked)} />
                        Débloque la classe
                      </label>
                    ) : (
                      <span className="leveling-locked-option">Classe déjà débloquée avant ce niveau</span>
                    )}
                    {canConfigureSubclassUnlock ? (
                      <label className="index-value-toggle">
                        <input type="checkbox" checked={Boolean(form.unlockSubclass)} onChange={(e) => set('unlockSubclass', e.target.checked)} />
                        Débloque la sous-classe
                      </label>
                    ) : (
                      <span className="leveling-locked-option">Sous-classe déjà débloquée avant ce niveau</span>
                    )}
                    {canConfigureMaitriseUnlock ? (
                      <label className="index-value-toggle">
                        <input type="checkbox" checked={Boolean(form.unlockMaitrise)} onChange={(e) => set('unlockMaitrise', e.target.checked)} />
                        Débloque la maîtrise
                      </label>
                    ) : (
                      <span className="leveling-locked-option">Maîtrise déjà débloquée avant ce niveau</span>
                    )}
                  </div>
                </>
              )}

              {!isLevelZero && (
                <div className="leveling-resource-note">
                  <strong>Gain de ressource automatique</strong>
                  <p>
                    À chaque niveau, le personnage choisit une ressource et lance le dé configuré par sa classe ou sa sous-classe.
                  </p>
                </div>
              )}

              <div className="comp-form-footer">
                <button className="admin-btn" onClick={closeForm}>Annuler</button>
                <button className="race-form-save-btn" onClick={save}>{editingRule ? 'Enregistrer' : 'Créer le palier'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.title}
          message={confirmDelete.message}
          dangerLabel={confirmDelete.dangerLabel}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => { confirmDelete.onConfirm(); setConfirmDelete(null); }}
        />
      )}
    </div>
  );
}
