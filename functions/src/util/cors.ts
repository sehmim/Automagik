import * as cors from "cors";

export const corsHandler = cors({
  origin: [
    "http://localhost:8080",
    "https://agent-dash-connect.lovable.app",
    "https://agent-dash-connect.vercel.app"
  ],
  methods: ["POST"],
  optionsSuccessStatus: 200,
});