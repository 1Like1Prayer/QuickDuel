import commonJson from "./common.json";
import mainMenuJson from "./mainMenu.json";
import difficultySelectJson from "./difficultySelect.json";
import settingsJson from "./settings.json";
import tutorialJson from "./tutorial.json";
import endScreenJson from "./endScreen.json";
import installPromptJson from "./installPrompt.json";
import gameJson from "./game.json";

export const copies = {
  common: commonJson,
  mainMenu: mainMenuJson,
  difficultySelect: difficultySelectJson,
  settings: settingsJson,
  tutorial: tutorialJson,
  endScreen: endScreenJson,
  installPrompt: installPromptJson,
  game: gameJson,
} as const;
