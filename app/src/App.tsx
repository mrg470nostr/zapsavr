import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RoleSelect } from "./screens/RoleSelect";
import { ParentFlow } from "./screens/ParentFlow";
import { KidFlow } from "./screens/KidFlow";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/parent" element={<ParentFlow />} />
        <Route path="/kid" element={<KidFlow />} />
      </Routes>
    </BrowserRouter>
  );
}
