
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import { getGardenDb } from "./features/garden/repository/gardenDb";
  import "./styles/index.css";
  

  void getGardenDb().catch(error => {
  console.error("Не удалось открыть IndexedDB:", error);
});

  createRoot(document.getElementById("root")!).render(<App />);
  