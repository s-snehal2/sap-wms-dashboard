import type { Note, Project } from "./types";

export const SEED_PROJECTS: Project[] = [
  {pid:"CMC0001",sr:49,name:"ZPRG_ZMRP_ADD_PRD - Production Planning Summary Report (Plan vs PRD)",type:"MIS",plant:"AD",sys:"SAP",mod:"PP",phase:"Dev & Test",status:"Parked",pct:75,notes:"Display Customer final, remove Customer Name from Key Field validation.",quarter:"Q1"},
  {pid:"CMC0002",sr:51,name:"ND Production & Planning Summary in SAP",type:"MIS",plant:"ND",sys:"SAP",mod:"PP",phase:"Dev & Test",status:"WIP",pct:65,notes:"",quarter:"Q1"},
  {pid:"CMC0003",sr:52,name:"Production Order Standard Vs Actuals Comparison Summary (BW)",type:"MIS",plant:"AD",sys:"BW",mod:"PP",phase:"Dev & Test",status:"WIP",pct:90,notes:"Walkthrough with Nitin Sir completed 12/07/2025.",quarter:"Q1"},
  {pid:"CMC0004",sr:1,name:"AD Plant Maintenance - C2 & C4 Lines Master Data Creation in SAP",type:"New Process",plant:"AD",sys:"SAP",mod:"PP",phase:"PRD-Live",status:"Done",pct:100,notes:"C2 Done 04/04/2026. C1 Done 08/04/2026.",quarter:"Q1"},
  {pid:"CMC0005",sr:2,name:"AD Production Order Auto-Confirmation Process",type:"New Process",plant:"AD",sys:"SAP/WMS",mod:"PP",phase:"Open",status:"Open",pct:10,notes:"",quarter:"Q2"},
  {pid:"CMC0006",sr:3,name:"ND Production Order Auto-Create & Release Process",type:"New Process",plant:"ND",sys:"SAP/WMS",mod:"PP",phase:"Open",status:"Open",pct:10,notes:"",quarter:"Q2"},
  {pid:"CMC0007",sr:4,name:"ND Production Order Auto-Confirmation Process",type:"New Process",plant:"ND",sys:"SAP/WMS",mod:"PP",phase:"Open",status:"Open",pct:10,notes:"",quarter:"Q2"},
  {pid:"CMC0008",sr:5,name:"ZCO_BOM01 Module Pool - BoM Details, Deletion Flags & Costing BoM Status",type:"New Process",plant:"AD",sys:"WMS",mod:"PP",phase:"Dev & Test",status:"Parked",pct:75,notes:"",quarter:"Q1"},
  {pid:"CMC0009",sr:6,name:"AD Production Order Auto-Create & Release Process",type:"New Process",plant:"AD",sys:"SAP/WMS",mod:"PP",phase:"Dev & Test",status:"WIP",pct:35,notes:"",quarter:"Q2"},
  {pid:"CMC0010",sr:7,name:"Data Digitalization - AD Block Cut to Slabs Process",type:"Project",plant:"AD",sys:"SAP/WMS",mod:"PP",phase:"Open",status:"Open",pct:0,notes:"Resource: ABAP & Developer",quarter:"Q3"},
  {pid:"CMC0011",sr:8,name:"AD BOM Approval Form Auto-Generate at User End",type:"Project",plant:"AD",sys:"SAP/WMS",mod:"PP",phase:"Open",status:"Open",pct:0,notes:"",quarter:"Q3"},
  {pid:"CMC0012",sr:9,name:"AD Production Batch Trace with WIP to Other Grades",type:"Project",plant:"AD",sys:"SAP/WMS",mod:"PP",phase:"Open",status:"Open",pct:0,notes:"",quarter:"Q3"},
  {pid:"CMC0013",sr:10,name:"AD Pre-Mix Production Process - Requirements Gathering",type:"Project",plant:"AD",sys:"SAP/WMS",mod:"PP",phase:"Open",status:"Open",pct:10,notes:"",quarter:"Q2"},
  {pid:"CMC0014",sr:11,name:"AD Polishing Slabs AI Quality Inspection (Marble Slabs Scanner)",type:"Project",plant:"AD",sys:"Others",mod:"PP",phase:"Open",status:"Open",pct:0,notes:"Resource: ABAP & Developer",quarter:"Q3"},
  {pid:"CMC0015",sr:12,name:"AD Online Dashboard - IoT Sensors (Temp, Vibration & Pressure)",type:"Project",plant:"AD",sys:"Others",mod:"PM",phase:"Open",status:"Open",pct:0,notes:"Not to integrate with SAP.",quarter:"Q3"},
  {pid:"CMC0016",sr:13,name:"VEEGOO Line - Finalization with VEEGOO Quotation",type:"Project",plant:"AD",sys:"Others",mod:"PP",phase:"Open",status:"Open",pct:0,notes:"",quarter:"Q4"},
  {pid:"CMC0017",sr:14,name:"WMS & SAP Integration using APIs (PRD Confirmation & Cancellation)",type:"Project",plant:"AD & ND",sys:"SAP/WMS",mod:"PP",phase:"Dev & Test",status:"Parked",pct:35,notes:"Discussion with Rahul & Manoj.",quarter:"Q1"},
  {pid:"CMC0018",sr:15,name:"WMS Application on iOS Platform (iPad 10th Gen)",type:"Project",plant:"AD & ND",sys:"WMS",mod:"ALL",phase:"Dev & Test",status:"Parked",pct:50,notes:"iPad 10th Gen.",quarter:"Q1"},
  {pid:"CMC0019",sr:16,name:"AD SAP Plan (MD11) to WMS PRD-AD & ZCO_AD Integration",type:"Project",plant:"AD",sys:"SAP/WMS",mod:"PP",phase:"Dev & Test",status:"Parked",pct:50,notes:"ZCO_AD developed, testing in progress.",quarter:"Q2"},
  {pid:"CMC0020",sr:17,name:"AD Polish Slabs Sticker Auto Print & Laying Process",type:"Project",plant:"AD",sys:"Others",mod:"PP",phase:"WIP",status:"WIP",pct:10,notes:"",quarter:"Q2"},
  {pid:"CMC0021",sr:18,name:"Production Data Digitalization - Quartz & Marble Polishing Lines",type:"Project",plant:"AD",sys:"SAP/WMS",mod:"PP",phase:"Dev & Test",status:"WIP",pct:35,notes:"",quarter:"Q2"},
  {pid:"CMC0022",sr:19,name:"AD Production Data Digitalization - Quartz Quality Grading Process",type:"Project",plant:"AD",sys:"SAP/WMS",mod:"PP",phase:"Dev & Test",status:"WIP",pct:35,notes:"Production Process Modification & Reports.",quarter:"Q2"},
  {pid:"CMC0023",sr:20,name:"Standard BOM Updating - Unit 1 (ND)",type:"Project",plant:"ND",sys:"SAP",mod:"PP",phase:"WIP",status:"WIP",pct:30,notes:"",quarter:"Q3"},
  {pid:"CMC0024",sr:21,name:"ZGRADE Summary Production - Refinements",type:"MIS",plant:"ND",sys:"SAP",mod:"PP",phase:"PRD-Live",status:"Done",pct:100,notes:"Completed and live.",quarter:"Q1"}
];

export const SEED_NOTES: Note[] = [
  {id:"N001",cat:"idea",text:"Auto-generate weekly project status report and email to all stakeholders every Monday morning.",date:"2026-04-10",converted:false,projPid:null},
  {id:"N002",cat:"issue",text:"WMS PRD Cancellation API is missing error handling — needs retry logic and alerting on failure.",date:"2026-04-12",converted:false,projPid:null},
  {id:"N003",cat:"discussion",text:"Discussion with Rahul & Manoj: ZCO_AD integration timeline — target PRD-Live by end of June 2026.",date:"2026-04-15",converted:false,projPid:null},
  {id:"N004",cat:"research",text:"Research VEEGOO IoT SDK compatibility with existing SAP Fiori launchpad setup before procurement.",date:"2026-04-16",converted:false,projPid:null},
  {id:"N005",cat:"requirement",text:"Add role-based access control (RBAC) to the WMS iOS app before PRD rollout — critical security requirement.",date:"2026-04-18",converted:false,projPid:null},
  {id:"N006",cat:"idea",text:"Explore integrating Marble Slabs AI scanner data directly into SAP QM module for real-time quality tracking.",date:"2026-04-20",converted:false,projPid:null}
];
