import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text } from "pixi.js";

import { Scene } from "./game/components/Scene";

extend({ Container, Graphics, Sprite, Text });

export default function App() {
  return (
    <Application background={"#000000"} resizeTo={window}>
      <Scene />
    </Application>
  );
}
