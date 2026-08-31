import Recurring from '../models/Recurring.js';
export const listRecurring = async (req,res)=>{ const docs=await Recurring.find({ user:req.user._id }); res.json(docs); };
export const createRecurring = async (req,res)=>{ const doc=await Recurring.create({ user:req.user._id, ...req.body }); res.status(201).json(doc); };
export const updateRecurring = async (req,res)=>{ const doc=await Recurring.findOneAndUpdate({ _id:req.params.id, user:req.user._id }, req.body, { new:true }); if(!doc) return res.status(404).json({message:'Not found'}); res.json(doc); };
export const deleteRecurring = async (req,res)=>{ await Recurring.findOneAndDelete({ _id:req.params.id, user:req.user._id }); res.json({ok:true}); };