import type { Response, NextFunction, Request } from "express";

export const requireTeacher = (req: Request, res: Response, next: NextFunction) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized, token missing or invalid"
    });
  }

  if (req.role !== "teacher") {
    return res.status(403).json({
      success: false,
      error: "Forbidden, teacher access required"
    });
  }

  next();
};


export const requireStudent = (req: Request, res: Response, next: NextFunction) => {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized, token missing or invalid"
    });
  }

  if (req.role !== "student") {
    return res.status(401).json({
      success: false,
      error: "Forbidden, student access required"
    });
  }

  next();
};
