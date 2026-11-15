import { useState, type FormEvent } from "react";

type SuggestionKind = "timing" | "service";
type ContributionFields = {
  route: string;
  stop: string;
  currentTime: string;
  suggestedTime: string;
  operator: string;
  origin: string;
  destination: string;
  via: string;
  details: string;
};

const EMPTY_FIELDS: ContributionFields = {
  route: "", stop: "", currentTime: "", suggestedTime: "",
  operator: "", origin: "", destination: "", via: "", details: ""
};
const ENDPOINT = import.meta.env.VITE_CONTRIBUTION_SCRIPT_URL as string | undefined;

function cleanString(value: string, label: string, max = 240): string {
  const trimmed = value.replace(/[\r\n\t]+/g, " ").trim();
  if (!trimmed || trimmed.length > max || /[<>{}`\\]/.test(trimmed) || /(?:javascript:|<script|function\s*\(|=>)/i.test(trimmed)) {
    throw new Error(`Enter a valid ${label} using plain text.`);
  }
  return trimmed;
}

function validateTime(value: string, label: string): string {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error(`Choose a valid ${label}.`);
  return value;
}

export function ContributionChat({ appName, stops, routes }: { appName: string; stops: string[]; routes: string[] }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<SuggestionKind | null>(null);
  const [fields, setFields] = useState<ContributionFields>(EMPTY_FIELDS);
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  function choose(value: SuggestionKind) {
    setKind(value);
    setFields(EMPTY_FIELDS);
    setStatus("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");
    if (!kind) return;
    if (!ENDPOINT) {
      setStatus("Contributions are not connected yet. Add VITE_CONTRIBUTION_SCRIPT_URL to this app’s .env file.");
      return;
    }
    try {
      const plain = (value: string, label: string, max?: number) => cleanString(value, label, max);
      const payload = {
        app: appName,
        kind,
        route: kind === "timing" ? plain(fields.route, "route") : "",
        stop: kind === "timing" ? plain(fields.stop, "stop") : "",
        currentTime: kind === "timing" ? validateTime(fields.currentTime, "current time") : "",
        suggestedTime: validateTime(fields.suggestedTime, kind === "timing" ? "suggested time": "suggested departure time"),
        operator: kind === "service" ? plain(fields.operator, "bus or operator name") : "",
        origin: kind === "service" ? plain(fields.origin, "starting stop") : "",
        destination: kind === "service" ? plain(fields.destination, "destination stop") : "",
        via: kind === "service" && fields.via.trim() ? plain(fields.via, "stops along the way") : "",
        details: fields.details.trim() ? plain(fields.details, "additional details", 500) : ""
      };
      if (kind === "timing" && (!routes.includes(payload.route) || !stops.includes(payload.stop))) throw new Error("Choose a route and stop from the lists.");
      if (kind === "service") {
        if (!stops.includes(payload.origin) || !stops.includes(payload.destination) || payload.origin === payload.destination) throw new Error("Choose two different stops from the lists.");
        if (payload.via && payload.via.split(",").map((stop) => stop.trim()).some((stop) => !stops.includes(stop))) throw new Error("List intermediate stops using names from the stops list, separated by commas.");
      }
      setSending(true);
      await fetch(ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(payload)
      });
      setStatus("Thanks. Your suggestion has been sent for review.");
      setFields(EMPTY_FIELDS);
      setKind(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not send this suggestion. Check your entries and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="contribution-chat">
      {open && <section className="contribution-panel" role="dialog" aria-modal="false" aria-labelledby="contribution-title">
        <header className="contribution-header"><div><h2 id="contribution-title">Improve bus information</h2><p>Suggestions are reviewed before schedules change.</p></div><button type="button" className="contribution-close" onClick={() => setOpen(false)} aria-label="Close chat">×</button></header>
        <div className="contribution-messages" aria-live="polite">
          <p className="chat-bubble chat-assistant">Hi! What would you like to contribute?</p>
          <button className="chat-choice" type="button" onClick={() => choose("timing")}>Suggest a change to a listed time</button>
          <button className="chat-choice" type="button" onClick={() => choose("service")}>Suggest a bus or route</button>
          {kind && <p className="chat-bubble chat-user">{kind === "timing" ? "I’d like to update a bus time." : "I’d like to suggest a service."}</p>}
          {kind && <form className="contribution-form" onSubmit={submit} noValidate>
            {kind === "timing" ? <>
              <label>Route<select required value={fields.route} onChange={(e) => setFields({ ...fields, route: e.target.value })}><option value="">Choose a route</option>{routes.map((route) => <option key={route} value={route}>{route}</option>)}</select></label>
              <label>Stop<select required value={fields.stop} onChange={(e) => setFields({ ...fields, stop: e.target.value })}><option value="">Choose a stop</option>{stops.map((stop) => <option key={stop} value={stop}>{stop}</option>)}</select></label>
              <div className="chat-time-row"><label>Listed time<input required type="time" value={fields.currentTime} onChange={(e) => setFields({ ...fields, currentTime: e.target.value })} /></label><label>Suggested time<input required type="time" value={fields.suggestedTime} onChange={(e) => setFields({ ...fields, suggestedTime: e.target.value })} /></label></div>
            </> : <>
              <label>Bus or operator name<input required maxLength={100} value={fields.operator} onChange={(e) => setFields({ ...fields, operator: e.target.value })} placeholder="For example, Metro feeder" /></label>
              <label>From<select required value={fields.origin} onChange={(e) => setFields({ ...fields, origin: e.target.value })}><option value="">Choose a stop</option>{stops.map((stop) => <option key={stop} value={stop}>{stop}</option>)}</select></label>
              <label>To<select required value={fields.destination} onChange={(e) => setFields({ ...fields, destination: e.target.value })}><option value="">Choose a stop</option>{stops.map((stop) => <option key={stop} value={stop}>{stop}</option>)}</select></label>
              <label>Stops along the way <span>(optional, separate with commas)</span><input maxLength={240} value={fields.via} onChange={(e) => setFields({ ...fields, via: e.target.value })} placeholder="Stop names" /></label>
              <label>Suggested departure time<input required type="time" value={fields.suggestedTime} onChange={(e) => setFields({ ...fields, suggestedTime: e.target.value })} /></label>
            </>}
            <label>Details <span>(optional)</span><textarea maxLength={500} rows={2} value={fields.details} onChange={(e) => setFields({ ...fields, details: e.target.value })} placeholder="Anything else we should know?" /></label>
            {!ENDPOINT && <p className="chat-setup-note">Add the deployed Apps Script URL to this repo’s .env as VITE_CONTRIBUTION_SCRIPT_URL.</p>}
            {status && <p className="chat-status" role="status">{status}</p>}
            <button className="chat-submit" type="submit" disabled={sending}>{sending ? "Sending…" : "Send suggestion"}</button>
          </form>}
          {!kind && status && <p className="chat-status" role="status">{status}</p>}
        </div>
      </section>}
      <button type="button" className="contribution-launcher" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? "Close contribution chat" : "Open contribution chat"}>
        <span aria-hidden="true">{open ? "×" : "✎"}</span><span>{open ? "Close" : "Contribute"}</span>
      </button>
    </div>
  );
}
