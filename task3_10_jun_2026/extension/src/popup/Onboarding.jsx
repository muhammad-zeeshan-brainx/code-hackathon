import { useState } from "react";
import { registerUser } from "../shared/api.js";
import { saveUser } from "../shared/storage.js";

export default function Onboarding({ onComplete }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const data = await registerUser(name.trim(), email.trim());
      await saveUser(
        { userId: data.userId, name: data.name, email: data.email },
        {
          notificationWhitelist: data.notificationWhitelist,
          focusSchedule: data.focusSchedule,
        }
      );
      if (data.isReturningUser) {
        setMessage(`Welcome back, ${data.name}!`);
      }
      onComplete(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>Welcome to Focus Blocker</h2>
      <p className="muted">Enter your name and email to get started.</p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="name">Name</label>
          <input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        {message && <p className="success-text">{message}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
          {loading ? "Saving..." : "Continue"}
        </button>
      </form>
    </div>
  );
}
