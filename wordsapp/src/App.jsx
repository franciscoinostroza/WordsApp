import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { C } from './lib/tokens';
import Layout from './components/Layout';
import Login from './pages/Login';
import Home from './pages/Home';
import Decks from './pages/Decks';
import DeckDetail from './pages/DeckDetail';
import Review from './pages/Review';
import Chat from './pages/Chat';
import Quiz from './pages/Quiz';
import Write from './pages/Write';
import Listen from './pages/Listen';
import Cloze from './pages/Cloze';
import Scramble from './pages/Scramble';
import Progress from './pages/Progress';

function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: C.bg,
      }}>
        <div style={{
          width: 32, height: 32, border: `2px solid ${C.gold}`,
          borderTopColor: "transparent", borderRadius: "50%",
        }} className="animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/decks" element={<Decks />} />
            <Route path="/decks/:id" element={<DeckDetail />} />
            <Route path="/review" element={<Review />} />
            <Route path="/review/:deckId" element={<Review />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/write" element={<Write />} />
            <Route path="/listen" element={<Listen />} />
            <Route path="/cloze" element={<Cloze />} />
            <Route path="/scramble" element={<Scramble />} />
            <Route path="/progress" element={<Progress />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
