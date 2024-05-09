import { ErrorBoundary } from "react-error-boundary";
import "./App.css";
import { SendTokenForm } from "./components/SendTokenForm";
import FallbackComponent from "./components/Fallback/Fallback";

function App() {
  return (
    <ErrorBoundary fallbackRender={FallbackComponent}>
      <SendTokenForm />
    </ErrorBoundary>
  );
}

export default App;
