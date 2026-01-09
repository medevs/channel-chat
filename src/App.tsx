import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Landing } from "@/pages/Landing";
import { SignIn } from "@/pages/SignIn";
import { SignUp } from "@/pages/SignUp";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
