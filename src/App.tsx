import { Switch, Route, Router as WouterRouter } from "wouter";
import GamePage from "@/pages/GamePage";

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <Switch>
        <Route path="/" component={GamePage} />
        <Route component={GamePage} />
      </Switch>
    </WouterRouter>
  );
}

export default App;
