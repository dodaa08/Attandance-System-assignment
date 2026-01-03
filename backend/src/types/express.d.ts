import { user } from "./type";

declare global {
  namespace Express {
    interface Request {
      userId: string,
      role? : "teacher" | "student"
    }
  }
}
