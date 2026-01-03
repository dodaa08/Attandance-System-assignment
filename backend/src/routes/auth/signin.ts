import express from "express";
const SignInRoute = express.Router();
import { userModel } from "../../db/Schema.js";
import bcrypt from "bcrypt";
import z from "zod";
import jwt from "jsonwebtoken"; 
import Authmiddleware from "../../middleware/Authmiddleware.js";
SignInRoute.use(express.json());


const jwt_secret = process.env.JWT_SECRET || "123";

if (!jwt_secret) {
  throw new Error("JWT_SECRET must be defined in environment variables");
}

const UserSchema = z.object({
  password: z.string(),
  email: z.string().email(),
});

SignInRoute.get("/me", Authmiddleware, async (req, res)=>{
    try{
       const userDB = await userModel.findOne({
        _id : req.userId
       });

       if(!userDB){return res.status(401).json({
            success : false,
            error : "User not found"
       })}

       res.status(200).json({
           success: true,
           data: {
               _id : userDB._id,
               name : userDB.name,
               email : userDB.email,
               role : userDB.role
           }
       });
  }
    catch(error){
      res.status(401).json({
            success : false,
            error : `Error message`,
        });
    }
});

SignInRoute.post("/login", async (req, res)=>{
    try{
        const ValidatedData = UserSchema.parse(req.body);
        const {email, password} = ValidatedData;

        const checkUser = await userModel.findOne({email  : email});
        if(checkUser === null  || !checkUser){
          return res.status(400).json({
            success: false,
            error: "Invalid email or password"
          });
        }
        const isPasswordValid = await bcrypt.compare(password, checkUser.password);
        
        if (!checkUser || !isPasswordValid) {
            return res.status(400).json({
              success: false,
              error: "Invalid email or password"
            });
        }
         
          const token = jwt.sign({
            role : checkUser.role,
            userId : checkUser._id,
          }, jwt_secret
          );

      res.status(200).json({
        success: true,
        data: {
          token: token,
        }
      });

    }
    catch(error){
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: "Invalid request schema",
            });
        }
        
        console.error("Signin error:", error);
        res.status(500).json({
            success: false,
            error: "error message"
        });
    }
});

export default SignInRoute;