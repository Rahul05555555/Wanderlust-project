const express =require("express");
const router=express.Router();
const wrapAsync=require("../utils/wrapAsync.js");
const ExpressError=require("../utils/ExpressError.js");
const {listingSchema,reviewSchema}=require("../schema.js");
const Listing=require("../models/listing.js");
const { isLoggedIn,isOwner } = require("../middleware.js");
const multer  = require('multer');
const {storage}=require("../cloudConfig.js");
const upload = multer({storage });

const validateListing =(req,res,next)=>{
    let {error}= listingSchema.validate(req.body);
      
      if(error){
        let errMsg=error.details.map((el)=>el.message).join(",");
        throw new ExpressError(400,errMsg);
      }else{
        next();
      }
};

//index route
router.get("/",
     wrapAsync(async (req,res) => {
    const allListings=await Listing.find({});
    res.render("listings/index.ejs",{allListings});        
 })
);
 
 //new route
 router.get("/new",isLoggedIn,(req,res)=>{
     res.render("listings/new.ejs");
 });
 
 //show route
 router.get(
    "/:id",
    wrapAsync(async(req,res)=>{
     let {id}=req.params;
     const listing=await Listing.findById(id)
     .populate({
        path:"review",
        populate:{
            path:"author",
        },
    })
     .populate("owner");
     if(!listing){
        req.flash("error","listing you requested for does not exist:");
        res.redirect("./listings");
     }
     res.render("listings/show.ejs",{listing});
 }));

 //create route
 router.post(
    "/",
    isLoggedIn,
    upload.single('listing[image]'),
    validateListing,
    wrapAsync(async(req,res,next)=>{
        let url= req.file.path;
        let filename= req.file.filename;

        const newListing=new Listing(req.body.listing);
        newListing.owner=req.user._id;
        newListing.image={url,filename};
        await newListing.save();
        req.flash("success","New Listing Created:");
        res.redirect("/listings");
    })
    
);


//edit route
router.get(
    "/:id/edit",
    isLoggedIn,
    isOwner,
    wrapAsync(async (req,res)=>{
    let {id}=req.params;
    const listing=await Listing.findById(id);
    if(!listing){
        req.flash("error","listing you requested for does not exist:");
        res.redirect("./listings");
     }
    res.render("listings/edit.ejs",{listing});
}));

//update route
router.put(
    "/:id",
    isLoggedIn,
    isOwner,
    upload.single('listing[image]'),
     validateListing,
    wrapAsync(async(req,res)=>{
    let {id}=req.params;
    let listing=await Listing.findByIdAndUpdate(id,{...req.body.listing});
    if(typeof req.file!=="undefined"){
    let url= req.file.path;
    let filename= req.file.filename;
    listing.image=={url, filename};
    await listing.save();
    }
    req.flash("success"," Listing Updated:");
    res.redirect(`/listings/${id}`);
})
);

//delete route
router.delete("/:id",
    isLoggedIn,
    isOwner,
     wrapAsync(async (req,res) => {
    let {id}=req.params;
    let deletedListing=await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    req.flash("success"," Listing Deleted:");
    res.redirect("/listings");
}));

module.exports=router;