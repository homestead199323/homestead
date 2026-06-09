import {
  Home, ClipboardList, Sprout, CalendarDays, Package,
  TrendingUp, BookOpen, MessageSquare, MoreHorizontal, PawPrint, Map,
} from "lucide-react";

/* ═══════════════════════════════════════════
   NAVIGATION CONFIG
   Used by App.jsx sidebar (NAV), mobile bottom tabs (BOTTOM_TABS),
   and mobile More drawer (MORE_ITEMS).
   ═══════════════════════════════════════════ */

export const NAV = [
  {id:"home",    l:"Today",         E:Home},
  {id:"tasks",   l:"Tasks",         E:ClipboardList},
  {id:"map",     l:"Map",           E:Map},
  {id:"crops",   l:"Crops",         E:Sprout},
  {id:"live",    l:"Animals",       E:PawPrint},
  {id:"season",  l:"Seasonal",      E:CalendarDays},
  {id:"pantry",  l:"Pantry",        E:Package},
  {id:"fin",     l:"Financials",    E:TrendingUp},
  {id:"manuals", l:"Manuals",       E:BookOpen},
  {id:"feedback",l:"Give Feedback", E:MessageSquare},
];

export const BOTTOM_TABS = [
  {id:"home",   l:"Today",   E:Home},
  {id:"map",    l:"Map",     E:Map},
  {id:"live",   l:"Animals", E:PawPrint},
  {id:"pantry", l:"Pantry",  E:Package},
  {id:"more",   l:"More",    E:MoreHorizontal},
];

export const MORE_ITEMS = [
  {id:"crops",   l:"Crops",         E:Sprout},
  {id:"tasks",   l:"Task Queue",    E:ClipboardList},
  {id:"season",  l:"Seasonal",      E:CalendarDays},
  {id:"fin",     l:"Financials",    E:TrendingUp},
  {id:"manuals", l:"Manuals",       E:BookOpen},
  {id:"feedback",l:"Give Feedback", E:MessageSquare},
];
