const express=require("express")
const multer=require("multer")
const sharp=require("sharp")
const User=require("../models/user")
const auth=require("../middleware/auth")
const {sendWelcomeEmail,sendCancelationEmail}=require("../emails/account")
const router=new express.Router()

router.post("/users",async(req,res)=>{       //sign up
    //console.log(req.body)
    const user=new User(req.body)
    try{
        await user.save()
        sendWelcomeEmail(user.email,user.name)
        const token=await user.generateAuthToken()

        res.status(201).send({user,token})
    }catch(e){
         res.status(400).send(e)
    }
    // user.save().then(()=>{
    //     res.send(user)
    // }).catch(error=>{
    //     // console.log(error)
    //     res.status(400).send(error)
       
    // })
    // res.send("testing")
})

router.post("/users/login",async(req,res)=>{                 //signin 
try{
    const user=await User.findByCredentials(req.body.email,req.body.password)
    const token=await user.generateAuthToken()
    res.send({user,token})
}catch (e){
res.status(400).send()
}
})     

router.post("/users/logout",auth,async(req,res)=>{
    try{
        req.user.tokens=req.user.tokens.filter((token)=>{
            return token.token !==req.token
        })
        await req.user.save()

        res.send()
    }catch (e){
        res.status(500).send()
    }
})
router.post("/users/logoutAll",auth,async(req,res)=>{
    try{
        req.user.tokens=[]
        await req.user.save()
        res.send()
    }catch (e){
        res.status(500).send()
    }
})

router.get("/users/me",auth,async(req,res)=>{ 
    res.send(req.user)
    // try{
    //     const users=await User.find({})
    //     res.send(users)

    // }catch(e){
    //     res.status(500).send()

    // }
    // User.find({}).then((users)=>{
    //     res.send(users)
    // }).catch(e=>{
    //     res.status(500).send(e)
    // })
})

router.patch("/users/me",auth,async(req,res)=>{
    const updates=Object.keys(req.body)
    const allowedUpdates=["name","email","password","age"]
    const isValidOperation=updates.every((update)=>{
        return allowedUpdates.includes(update)
    })
        if(!isValidOperation){
            return res.status(400).send({error:"Invalid update"})
        }
    
    try{
// const user=await User.findById(req.params.id)
updates.forEach((update)=>req.user[update]=req.body[update])
await req.user.save()


       // const user=await User.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true})
        // if(!user){
        //     return res.status(404).send()
        // }
        res.send(req.user)

    }catch(e){
        res.status(400).send(e)
        
    }
})

router.delete("/users/me",auth,async(req,res)=>{
    try{
        // const user=await User.findByIdAndDelete(req.user._id)
        // if(!user){
        //     return res.status(404).send()
        // }
       await req.user.remove()
       sendCancelationEmail(req.user.email,req.user.name)
        res.send(req.user)
    }catch(e){
        res.status(500).send()
    }
});

const upload=multer({
    // dest:"avatars",
    limits:{
        fileSize:1000000
    },
    fileFilter(req,file,cb){
        if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
            return cb(new Error("Please upload an image "))
        }
        cb(undefined,true)
    }
});
// const errorMidddleware=(req,res,next)=>{
//     throw new Error("From my middleware")
// }
router.post("/users/me/avatar",auth,upload.single('avatar'),async(req,res)=>{
    const buffer=await sharp(req.file.buffer).resize({width:250,height:250}).png().toBuffer()
    
    req.user.avatar=buffer
    await req.user.save()
    res.send()
},(error,req,res,next)=>{
    res.status(400).send({
        error:error.message
    })
})

router.delete("/users/me/avatar",auth,async(req,res)=>{
    req.user.avatar=undefined
    await req.user.save()
    res.send()
})

router.get("/users/:id/avatar",async(req,res)=>{
    try{
        const  user=await User.findById(req.params.id)
        if(!user || !user.avatar){
            throw new Error()
        }
        res.set("Content-Type","image/png")
        res.send(user.avatar)
    }catch(e){
        res.status(404).send()
    }
})

module.exports=router

// inside jsbin.com
//html section inside body tag
//<img src="http://localhost:3000/users/62b9aaf290ec44241c39fac4/avatar"