import { Application, extend } from "@pixi/react";
import { Container, Sprite } from "pixi.js";

import { Scene } from "./game/components/Scene";

extend({ Container, Sprite });

export default function App() {
  return (
    <Application background={"#000000"} resizeTo={window}>
      <Scene />
    </Application>
  );
}
