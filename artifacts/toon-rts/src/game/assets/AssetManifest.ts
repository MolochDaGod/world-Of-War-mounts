import { Vector3, Color } from 'three';

export const AssetManifest = {
  Barbarians: {
    characters: '/assets/Toon_RTS/Barbarians/models/BRB_Characters_customizable.FBX',
    cavalry: '/assets/Toon_RTS/Barbarians/models/BRB_Cavalry_customizable.FBX',
    texture: '/assets/Toon_RTS/Barbarians/models/Materials/BRB_StandardUnits_texture.tga',
  },
  Dwarves: {
    characters: '/assets/Toon_RTS/Dwarves/models/DWF_Characters_customizable.FBX',
    cavalry: '/assets/Toon_RTS/Dwarves/models/DWF_Cavalry_customizable.FBX',
    texture: '/assets/Toon_RTS/Dwarves/models/Materials/DWF_Standard_Units.tga',
  },
  Elves: {
    characters: '/assets/Toon_RTS/Elves/models/ELF_Characters_customizable.FBX',
    cavalry: '/assets/Toon_RTS/Elves/models/ELF_Cavalry_customizable.FBX',
    boltThrower: '/assets/Toon_RTS/Elves/models/ELF_BoltThrower.FBX',
    texture: '/assets/Toon_RTS/Elves/models/Materials/ELF_HighElves_Texture.tga',
  },
  Orcs: {
    characters: '/assets/Toon_RTS/Orcs/models/ORC_Characters_Customizable.FBX',
    cavalry: '/assets/Toon_RTS/Orcs/models/ORC_Cavalry_Customizable.FBX',
    catapult: '/assets/Toon_RTS/Orcs/models/ORC_Catapult.FBX',
    texture: '/assets/Toon_RTS/Orcs/models/Materials/textures/ORC_StandardUnits.tga',
  },
  WesternKingdoms: {
    characters: '/assets/Toon_RTS/WesternKingdoms/models/WK_Characters_customizable.FBX',
    cavalry: '/assets/Toon_RTS/WesternKingdoms/models/WK_Cavalry_customizable.FBX',
    catapult: '/assets/Toon_RTS/WesternKingdoms/models/WK_Catapult.FBX',
    texture: '/assets/Toon_RTS/WesternKingdoms/models/Materials/textures/WK_Standard_Units.tga',
  },
  Undead: {
    characters: '/assets/Toon_RTS/Undead/models/UD_Characters_customizable.FBX',
    cavalry: '/assets/Toon_RTS/Undead/models/UD_Cavalry_customizable.FBX',
    texture: '/assets/Toon_RTS/Undead/models/Materials/UD_Standard_Units.tga',
  }
};

export const TeamColors = {
  1: new Color('#2a6fb3'), // Blue for player
  2: new Color('#b3392a'), // Red for enemy
};
