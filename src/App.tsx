import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite } from "pixi.js";

import { Scene } from "./game/components/Scene";

extend({ Container, Graphics, Sprite });

export default function App() {
  return (
    <Application background={"#000000"} resizeTo={window}>
      <Scene />
    </Application>
  );
}
