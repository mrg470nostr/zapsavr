import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { RoleSelect } from "./screens/RoleSelect";
import { ParentFlow } from "./screens/ParentFlow";
import { KidFlow } from "./screens/KidFlow";
import { ErrorBoundary } from "./components/ErrorBoundary";

function RoutesWithBoundary() {
  // Keyed by pathname so navigating away from a crashed screen (e.g. back
  // to "/") clears the error instead of staying stuck on the fallback.
  const location = useLocation();
  return (
    <ErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/parent" element={<ParentFlow />} />
        <Route path="/kid" element={<KidFlow />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <RoutesWithBoundary />
    </BrowserRouter>
  );
}
