import express from "express";
const SignupRoute = express.Router();
import { userModel } from "../../db/Schema.js";
import bcrypt from "bcrypt";
const salt = 10;
import z from "zod";
SignupRoute.use(express.json());

const UserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Invalid email format"),
  role: z.enum(["teacher", "student"], {
    message: "Role must be either 'teacher' or 'student'"
  })
});

SignupRoute.post("/signup", async (req, res)=>{
    try{
    const ValidatedData = UserSchema.parse(req.body);
    const {name, email, password, role} = ValidatedData;

        const checkUser = await userModel.findOne({email  : email});

         if (checkUser) {
            return res.status(400).json({
                success: false,
                error: "Email already exists"
            });
         }

            const hashed_password = await bcrypt.hash(password, salt);
            const data = await userModel.create({
                name : name,
                email : email,
                password : hashed_password,
                role : role
            });

            res.status(201).json({
               success: true,
               data: {
                "_id": data._id,
                "name": data.name,
                "email": data.email,
                "role": data.role
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
        
        console.error("Signup error:", error);
        res.status(400).json({
            success: false,
            error: "error message"
        });
    }    
});


export default SignupRoute;