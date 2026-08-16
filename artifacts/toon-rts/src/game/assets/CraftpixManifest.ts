/** 
 * CraftpixManifest — verified paths for all craftpix asset packs.
 * All paths resolve relative to public/ (served as static files).
 */
export const CP = '/assets/craftpix';

// ── Orc characters ────────────────────────────────────────────────────────────
export const OrcModels = {
  texture:   `${CP}/201889-orc-3d-low-poly-models-pack/texture/Texture_MAp.png`,
  king:      `${CP}/201889-orc-3d-low-poly-models-pack/fbx/unity_fbx/_king.fbx`,
  queen:     `${CP}/201889-orc-3d-low-poly-models-pack/fbx/unity_fbx/_queen.fbx`,
  warriors: [
    `${CP}/201889-orc-3d-low-poly-models-pack/fbx/unity_fbx/_orcs_city_dwellers_1.fbx`,
    `${CP}/201889-orc-3d-low-poly-models-pack/fbx/unity_fbx/_orcs_city_dwellers_2.fbx`,
    `${CP}/201889-orc-3d-low-poly-models-pack/fbx/unity_fbx/_orcs_city_dwellers_3.fbx`,
    `${CP}/201889-orc-3d-low-poly-models-pack/fbx/unity_fbx/_orcs_city_dwellers_4.fbx`,
    `${CP}/201889-orc-3d-low-poly-models-pack/fbx/unity_fbx/_orcs_dwellers_6.fbx`,
  ],
  peasants: [
    `${CP}/201889-orc-3d-low-poly-models-pack/fbx/unity_fbx/_peasant_1.fbx`,
    `${CP}/201889-orc-3d-low-poly-models-pack/fbx/unity_fbx/_peasant_2.fbx`,
    `${CP}/201889-orc-3d-low-poly-models-pack/fbx/unity_fbx/_peasant_3.fbx`,
  ],
};

// ── Elf characters ────────────────────────────────────────────────────────────
export const ElfModels = {
  texture:    `${CP}/788035-elves-3d-low-poly-model-pack/texture/Texture_MAp_ELfs.png`,
  king:       `${CP}/788035-elves-3d-low-poly-model-pack/fbx/elfs_unity/_king.fbx`,
  queen:      `${CP}/788035-elves-3d-low-poly-model-pack/fbx/elfs_unity/_queen.fbx`,
  commoners: [
    `${CP}/788035-elves-3d-low-poly-model-pack/fbx/elfs_unity/_elf_commoner_1.fbx`,
    `${CP}/788035-elves-3d-low-poly-model-pack/fbx/elfs_unity/_elf_commoner_2.fbx`,
    `${CP}/788035-elves-3d-low-poly-model-pack/fbx/elfs_unity/_elf_commoner_3.fbx`,
    `${CP}/788035-elves-3d-low-poly-model-pack/fbx/elfs_unity/_elf_commoner_4.fbx`,
  ],
  nobles: [
    `${CP}/788035-elves-3d-low-poly-model-pack/fbx/elfs_unity/_elf_upper_class_1.fbx`,
    `${CP}/788035-elves-3d-low-poly-model-pack/fbx/elfs_unity/_elf_upper_class_2.fbx`,
    `${CP}/788035-elves-3d-low-poly-model-pack/fbx/elfs_unity/_elf_upper_class_3.fbx`,
  ],
};

// ── Medieval human characters ─────────────────────────────────────────────────
export const MedievalModels = {
  texture: `${CP}/700077-free-medieval-3d-people-low-poly-models/texture/people_texture_map.png`,
  king:    `${CP}/700077-free-medieval-3d-people-low-poly-models/fbx/people_unity/king.fbx`,
  queen:   `${CP}/700077-free-medieval-3d-people-low-poly-models/fbx/people_unity/queen.fbx`,
  units: [
    `${CP}/700077-free-medieval-3d-people-low-poly-models/fbx/people_unity/city_dwellers_1.fbx`,
    `${CP}/700077-free-medieval-3d-people-low-poly-models/fbx/people_unity/city_dwellers_2.fbx`,
    `${CP}/700077-free-medieval-3d-people-low-poly-models/fbx/people_unity/peasant_1.fbx`,
    `${CP}/700077-free-medieval-3d-people-low-poly-models/fbx/people_unity/peasant_2.fbx`,
    `${CP}/700077-free-medieval-3d-people-low-poly-models/fbx/people_unity/peasant_3.fbx`,
  ],
};

// ── Wildlife ──────────────────────────────────────────────────────────────────
export const AnimalModels = {
  texture: `${CP}/636502-free-wild-animal-3d-low-poly-models/texture/wild_animals_map.png`,
  bear:    `${CP}/636502-free-wild-animal-3d-low-poly-models/fbx/unity/bear.fbx`,
  boar:    `${CP}/636502-free-wild-animal-3d-low-poly-models/fbx/unity/boar.fbx`,
  deer1:   `${CP}/636502-free-wild-animal-3d-low-poly-models/fbx/unity/deer_1.fbx`,
  deer2:   `${CP}/636502-free-wild-animal-3d-low-poly-models/fbx/unity/deer_2.fbx`,
  fox:     `${CP}/636502-free-wild-animal-3d-low-poly-models/fbx/unity/fox.fbx`,
  owl:     `${CP}/636502-free-wild-animal-3d-low-poly-models/fbx/unity/owl.fbx`,
  rabbit:  `${CP}/636502-free-wild-animal-3d-low-poly-models/fbx/unity/rabbit.fbx`,
  wolf:    `${CP}/636502-free-wild-animal-3d-low-poly-models/fbx/unity/wolf.fbx`,
};

// ── Environment ───────────────────────────────────────────────────────────────
export const TreeModels = {
  texture: `${CP}/781618-free-tree-3d-low-poly-pack/Textures/T_Trees_temp_climate.png`,
  // 10 tree variants; cycle them for variety
  models: Array.from({ length: 10 }, (_, i) =>
    `${CP}/781618-free-tree-3d-low-poly-pack/Fbx/Tree_temp_climate_0${String(i + 1).padStart(2, '0')}.FBX`,
  ),
};

export const MountainModels = {
  texture: `${CP}/891170-mountain-3d-low-poly-models/Textures/T_Mountains_temperate_climate_32.png`,
  mountains: [
    `${CP}/891170-mountain-3d-low-poly-models/Fbx/Mountains_temperate_climate_001.fbx`,
    `${CP}/891170-mountain-3d-low-poly-models/Fbx/Mountains_temperate_climate_002.fbx`,
    `${CP}/891170-mountain-3d-low-poly-models/Fbx/Mountains_temperate_climate_003.fbx`,
    `${CP}/891170-mountain-3d-low-poly-models/Fbx/Mountains_temperate_climate_004.fbx`,
    `${CP}/891170-mountain-3d-low-poly-models/Fbx/Mountains_temperate_climate_005.fbx`,
  ],
  hills: [
    `${CP}/891170-mountain-3d-low-poly-models/Fbx/Hill_temperate_climate_001.fbx`,
    `${CP}/891170-mountain-3d-low-poly-models/Fbx/Hill_temperate_climate_002.fbx`,
    `${CP}/891170-mountain-3d-low-poly-models/Fbx/Hill_temperate_climate_003.fbx`,
    `${CP}/891170-mountain-3d-low-poly-models/Fbx/Hill_temperate_climate_004.fbx`,
    `${CP}/891170-mountain-3d-low-poly-models/Fbx/Hill_temperate_climate_005.fbx`,
  ],
  plateaus: [
    `${CP}/891170-mountain-3d-low-poly-models/Fbx/Plateau_temperate_climate_001.fbx`,
    `${CP}/891170-mountain-3d-low-poly-models/Fbx/Plateau_temperate_climate_002.fbx`,
  ],
};

export const VolcanoModels = {
  texture:   `${CP}/891160-volcano-3d-low-poly-models/Textures/T_Volcanoe.png`,
  volcanoes: [
    `${CP}/891160-volcano-3d-low-poly-models/Fbx/Volcanoe_01.fbx`,
    `${CP}/891160-volcano-3d-low-poly-models/Fbx/Volcanoe_02.fbx`,
    `${CP}/891160-volcano-3d-low-poly-models/Fbx/Volcanoe_03.fbx`,
    `${CP}/891160-volcano-3d-low-poly-models/Fbx/Volcanoe_04.fbx`,
    `${CP}/891160-volcano-3d-low-poly-models/Fbx/Volcanoe_05.fbx`,
  ],
  boulders: [
    `${CP}/891160-volcano-3d-low-poly-models/Fbx/Boulder_01.fbx`,
    `${CP}/891160-volcano-3d-low-poly-models/Fbx/Boulder_02.fbx`,
    `${CP}/891160-volcano-3d-low-poly-models/Fbx/Boulder_03.fbx`,
    `${CP}/891160-volcano-3d-low-poly-models/Fbx/Boulder_04.fbx`,
    `${CP}/891160-volcano-3d-low-poly-models/Fbx/Boulder_05.fbx`,
  ],
};

// ── Resources ─────────────────────────────────────────────────────────────────
export const MineModels = {
  texture:   `${CP}/692030-mine-3d-low-poly-models/texture/Texture_MAp_mines.png`,
  mine1:     `${CP}/692030-mine-3d-low-poly-models/fbx/full/_mine_1.fbx`,
  mine2:     `${CP}/692030-mine-3d-low-poly-models/fbx/full/_mine_2.fbx`,
  mine3:     `${CP}/692030-mine-3d-low-poly-models/fbx/full/_mine_3.fbx`,
  gold1:     `${CP}/692030-mine-3d-low-poly-models/fbx/full/_gold_1.fbx`,
  gold2:     `${CP}/692030-mine-3d-low-poly-models/fbx/full/_gold_2.fbx`,
  crystal1:  `${CP}/692030-mine-3d-low-poly-models/fbx/full/_crystal_1.fbx`,
  crystal2:  `${CP}/692030-mine-3d-low-poly-models/fbx/full/_crystal_2.fbx`,
  crystal3:  `${CP}/692030-mine-3d-low-poly-models/fbx/full/_crystal_3.fbx`,
  coal:      `${CP}/692030-mine-3d-low-poly-models/fbx/full/_coal_1.fbx`,
  pickaxe:   `${CP}/692030-mine-3d-low-poly-models/fbx/full/_pick_1.fbx`,
};

// ── Loot / Items ──────────────────────────────────────────────────────────────
export const ChestModels = {
  texture: `${CP}/116189-chest-3d-low-poly-models/texture/Texture_MAp_sword.png`,
  models: [
    `${CP}/116189-chest-3d-low-poly-models/fbx/rig_unity/trunk_1.fbx`,
    `${CP}/116189-chest-3d-low-poly-models/fbx/rig_unity/trunk_2.fbx`,
    `${CP}/116189-chest-3d-low-poly-models/fbx/rig_unity/trunk_3.fbx`,
    `${CP}/116189-chest-3d-low-poly-models/fbx/rig_unity/trunk_4.fbx`,
    `${CP}/116189-chest-3d-low-poly-models/fbx/rig_unity/trunk_5.fbx`,
  ],
};

export const SwordModels = {
  texture: `${CP}/878389-free-sword-3d-low-poly-models/texture/Texture_MAp_sword.png`,
  models: [
    `${CP}/878389-free-sword-3d-low-poly-models/fbx/_sword_1.fbx`,
    `${CP}/878389-free-sword-3d-low-poly-models/fbx/_sword_2.fbx`,
    `${CP}/878389-free-sword-3d-low-poly-models/fbx/_sword_3.fbx`,
    `${CP}/878389-free-sword-3d-low-poly-models/fbx/_sword_4.fbx`,
    `${CP}/878389-free-sword-3d-low-poly-models/fbx/_sword_5.fbx`,
    `${CP}/878389-free-sword-3d-low-poly-models/fbx/_sword_6.fbx`,
  ],
};

export const HammerModels = {
  texture: `${CP}/755027-hammer-3d-low-poly-models/Texture/Texture_MAp_axHammers.png`,
  models: [
    `${CP}/755027-hammer-3d-low-poly-models/fbx/_hammer_01.fbx`,
    `${CP}/755027-hammer-3d-low-poly-models/fbx/_hammer_02.fbx`,
    `${CP}/755027-hammer-3d-low-poly-models/fbx/_hammer_03.fbx`,
    `${CP}/755027-hammer-3d-low-poly-models/fbx/_hammer_04.fbx`,
  ],
};

export const CaneModels = {
  texture: `${CP}/732691-cane-3d-low-poly-models/texture/Texture_MAp_cane.png`,
  models: [
    `${CP}/732691-cane-3d-low-poly-models/fbx/_Cane_1.fbx`,
    `${CP}/732691-cane-3d-low-poly-models/fbx/_Cane_2.fbx`,
    `${CP}/732691-cane-3d-low-poly-models/fbx/_Cane_3.fbx`,
  ],
};

// ── Fantasy UI PNG sprites (used in CSS/img src) ──────────────────────────────
const UI = `${CP}/891134-fantasy-strategy-game-ui/PNG`;
export const GameUI = {
  // Empty panel frames
  table1:        `${UI}/empty_table/table_1.png`,
  table2:        `${UI}/empty_table/table_2.png`,
  table3:        `${UI}/empty_table/table_3.png`,
  table4:        `${UI}/empty_table/table_4.png`,
  // Fight screen
  fightBg:       `${UI}/fight/bg.png`,
  fightArrow:    `${UI}/fight/arrow.png`,
  fightCircle:   `${UI}/fight/circle_bg.png`,
  fightBtnStart: `${UI}/fight/button_start.png`,
  fightBtnMap:   `${UI}/fight/button_map.png`,
  // Buttons
  btnEmpty1:     `${UI}/btn/button_empty_1.png`,
  btnEmpty2:     `${UI}/btn/button_empty_2.png`,
  btnLeft:       `${UI}/btn/button_left.png`,
  btnRight:      `${UI}/btn/button_right.png`,
  btnMenu:       `${UI}/btn/button_menu.png`,
  btnPause:      `${UI}/btn/button_pause.png`,
  btnRestart:    `${UI}/btn/button_restart.png`,
  btnSettings:   `${UI}/btn/button_settings.png`,
  // Win screen
  headerWin:     `${UI}/win/header_win.png`,
  winWindow:     `${UI}/win/normal_window.png`,
  winTable:      `${UI}/win/table.png`,
  star1:         `${UI}/win/star_1.png`,
  star2:         `${UI}/win/star_2.png`,
  star3:         `${UI}/win/star_3.png`,
  // Fail screen
  headerFailed:  `${UI}/failed/header_failed.png`,
  failWindow:    `${UI}/failed/wondow.png`,
  failTable:     `${UI}/failed/table.png`,
  // Shop
  headerShop:    `${UI}/shop/header_shop.png`,
  shopWindow:    `${UI}/shop/window.png`,
  shopTable:     `${UI}/shop/table.png`,
  crystal1:      `${UI}/shop/crystal_1.png`,
  crystal2:      `${UI}/shop/crystal_2.png`,
  crystal3:      `${UI}/shop/crystal_3.png`,
  // Upgrade
  headerUpgrade: `${UI}/upgrade/header_upgrade.png`,
  upgradeWindow: `${UI}/upgrade/window.png`,
  upgradeTable:  `${UI}/upgrade/table.png`,
  btnUpgrade:    `${UI}/upgrade/button_upgrade.png`,
  upgradeArrow:  `${UI}/upgrade/arrow.png`,
  upgradeIco1:   `${UI}/upgrade/ico_1.png`,
  upgradeIco2:   `${UI}/upgrade/ico_2.png`,
  upgradeIco3:   `${UI}/upgrade/ico_3.png`,
  upgradeIco4:   `${UI}/upgrade/ico_4.png`,
  upgradeIco5:   `${UI}/upgrade/ico_5.png`,
  // Difficulty
  btnEasy:       `${UI}/difficulty/button_easy.png`,
  btnNormal:     `${UI}/difficulty/button_normal.png`,
  btnHard:       `${UI}/difficulty/button_hard.png`,
  diffWindow:    `${UI}/difficulty/window.png`,
};
