import { Suspense } from 'react';
import { Canvas } from "@react-three/fiber";
import { Experience } from "./components/Experience";
import { Interface } from "./components/Interface";
import { Leva } from "leva";

function App() {
  console.log("App component rendering");
  return (
    <>
      <Leva hidden />
      <Canvas
        shadows
        camera={{ position: [0, 2, 5], fov: 75 }}
        onCreated={() => console.log("Canvas created")}
      >
        <Suspense fallback={<group><mesh><boxGeometry /><meshBasicMaterial color="red" /></mesh></group>}>
          {console.log("Suspense content rendering")}
          <Experience />
        </Suspense>
      </Canvas>
      <Interface />
    </>
  );
}

export default App;
