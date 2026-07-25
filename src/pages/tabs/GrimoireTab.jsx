import GrimoireBook from '../../components/grimoire/GrimoireBook';
import { useCharacterStore } from '../../store/characterStore';
import { useAdminStore } from '../../store/adminStore';
import { getGrimoireContext } from '../../domain/grimoireCalculations';

export default function GrimoireTab({ char }) {
  const { addSpell, updateSpell, removeSpell } = useCharacterStore();
  const admin = useAdminStore();
  const { spellTypes, spellZones, spellRanks, remainingSlots } = getGrimoireContext(char, admin);

  return (
    <div className="grimoire-tab-wrap">
      <GrimoireBook
        spells={char.sorts}
        characterName={char.nom}
        spellTypes={spellTypes}
        spellZones={spellZones}
        spellRanks={spellRanks}
        remainingSlots={remainingSlots}
        onAddSpell={(spell) => addSpell(char.id, spell)}
        onUpdateSpell={(spellId, patch) => updateSpell(char.id, spellId, patch)}
        onDeleteSpell={(spellId) => removeSpell(char.id, spellId)}
      />
    </div>
  );
}
