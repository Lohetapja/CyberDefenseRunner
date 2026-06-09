// questions.js — Live Quiz Training question set.
//
// The validated questions live in eight standalone topic files
// (questions-<topic>.js), which are loaded BEFORE this file in index.html.
// This file simply combines those validated banks into the global QUESTIONS
// array that app.js consumes. Keeping the topic files separate preserves them
// as the single validated source of truth (each is checked by tools/).
//
// Topics (must match the Learning Path names and app.js TOPIC_ORDER):
//   Networking Basics, Defending Systems, Attacking Concepts, Alert Investigation,
//   Cloud & DevOps, AI & Automation Safety, Identity & Logins, Malware Basics.

const TOPIC_BANKS = [
  typeof NETWORKING_BASICS_QUESTIONS    !== "undefined" ? NETWORKING_BASICS_QUESTIONS    : [],
  typeof DEFENDING_SYSTEMS_QUESTIONS    !== "undefined" ? DEFENDING_SYSTEMS_QUESTIONS    : [],
  typeof ATTACKING_CONCEPTS_QUESTIONS   !== "undefined" ? ATTACKING_CONCEPTS_QUESTIONS   : [],
  typeof ALERT_INVESTIGATION_QUESTIONS  !== "undefined" ? ALERT_INVESTIGATION_QUESTIONS  : [],
  typeof CLOUD_DEVOPS_QUESTIONS         !== "undefined" ? CLOUD_DEVOPS_QUESTIONS         : [],
  typeof AI_AUTOMATION_SAFETY_QUESTIONS !== "undefined" ? AI_AUTOMATION_SAFETY_QUESTIONS : [],
  typeof IDENTITY_LOGINS_QUESTIONS      !== "undefined" ? IDENTITY_LOGINS_QUESTIONS      : [],
  typeof MALWARE_BASICS_QUESTIONS       !== "undefined" ? MALWARE_BASICS_QUESTIONS       : []
];

// Flatten the eight banks into the single live QUESTIONS array used by the game.
const QUESTIONS = [].concat.apply([], TOPIC_BANKS);
