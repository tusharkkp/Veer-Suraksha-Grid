import React, { createContext, useContext, useState, useCallback } from 'react';

type Lang = 'mr' | 'en';

const translations: Record<string, Record<Lang, string>> = {
  // Header
  'app.title': { mr: 'स्वच्छता वीर एकात्मिक सुरक्षा व शासन व्यवसपीठ', en: 'Swachhata Veer Integrated Safety & Governance Platform' },
  'app.subtitle': { mr: 'वीर सुरक्षा ग्रिड', en: 'Veer Suraksha Grid' },
  'app.smc': { mr: 'सोलापूर महानगरपालिका', en: 'Solapur Municipal Corporation' },
  'lang.toggle': { mr: 'English', en: 'मराठी' },

  // Navigation
  'nav.dashboard': { mr: 'नियंत्रण कक्ष', en: 'Command Dashboard' },
  'nav.worker': { mr: 'कर्मचारी ॲप', en: 'Worker App' },
  'nav.map': { mr: 'नकाशा', en: 'Map View' },
  'nav.telemetry': { mr: 'सेन्सर डेटा', en: 'Telemetry' },
  'nav.workers': { mr: 'कर्मचारी व्यवस्थापन', en: 'Workers' },
  'nav.fleet': { mr: 'फ्लीटआय', en: 'FleetEye' },
  'nav.veerpass': { mr: 'वीरपास', en: 'VeerPass' },
  'nav.comms': { mr: 'संवाद', en: 'Communication' },
  'nav.sos': { mr: 'आपत्कालीन', en: 'Emergency' },
  'nav.blackbox': { mr: 'वीरब्लॅकबॉक्स', en: 'VeerBlackBox' },
  'nav.veerplan': { mr: 'वीरप्लान', en: 'VeerPlan' },
  'nav.analytics': { mr: 'विश्लेषण', en: 'Analytics' },

  // Analytics
  'analytics.title': { mr: 'विश्लेषण आणि अहवाल', en: 'Analytics & Reports' },
  'analytics.total_assets': { mr: 'एकूण मालमत्ता', en: 'Total Assets' },
  'analytics.active_workers': { mr: 'सक्रिय कर्मचारी', en: 'Active Workers' },
  'analytics.machines_in_use': { mr: 'वापरातील यंत्रे', en: 'Machines In Use' },
  'analytics.tasks_zone': { mr: 'कार्य क्षेत्र (आज)', en: 'Tasks Zone (Today)' },
  'analytics.pending_alerts': { mr: 'प्रलंबित सूचना', en: 'Pending Alerts' },
  'analytics.avg_risk': { mr: 'सरासरी जोखीम', en: 'Avg Risk' },
  'analytics.weekly_tasks': { mr: 'साप्ताहिक कार्ये आणि सूचना', en: 'Weekly Tasks & Alerts' },
  'analytics.tasks_done': { mr: 'कार्ये पूर्ण', en: 'Tasks Done' },
  'analytics.alerts_label': { mr: 'सूचना', en: 'Alerts' },
  'analytics.risk_trend': { mr: 'सरासरी जोखीम आणि H₂S प्रवृत्ती', en: 'Avg Risk & H₂S Trend' },
  'analytics.zone_dist': { mr: 'क्षेत्र वितरण', en: 'Zone Distribution' },
  'analytics.task_status': { mr: 'कार्य स्थिती वितरण', en: 'Task Status Distribution' },
  'analytics.weekly_usage': { mr: 'साप्ताहिक कर्मचारी आणि यंत्र वापर', en: 'Weekly Workers & Machine Usage' },
  'analytics.completed': { mr: 'पूर्ण', en: 'Completed' },

  // Risk
  'risk.high': { mr: 'उच्च जोखीम', en: 'High Risk' },
  'risk.medium': { mr: 'मध्यम जोखीम', en: 'Medium Risk' },
  'risk.low': { mr: 'कमी जोखीम', en: 'Low Risk' },
  'risk.level': { mr: 'जोखीम स्तर', en: 'Risk Level' },

  // Zone
  'zone.red': { mr: 'लाल क्षेत्र', en: 'Red Zone' },
  'zone.yellow': { mr: 'पिवळा क्षेत्र', en: 'Yellow Zone' },
  'zone.green': { mr: 'हिरवा क्षेत्र', en: 'Green Zone' },
  'zone.type': { mr: 'क्षेत्र प्रकार', en: 'Zone Type' },

  // Status
  'status.active': { mr: 'सक्रिय', en: 'Active' },
  'status.idle': { mr: 'निष्क्रिय', en: 'Idle' },
  'status.emergency': { mr: 'आपत्कालीन', en: 'Emergency' },
  'status.approved': { mr: 'मंजूर', en: 'Approved' },
  'status.pending': { mr: 'प्रलंबित', en: 'Pending' },
  'status.rejected': { mr: 'नाकारले', en: 'Rejected' },
  'status.hold': { mr: 'रोखले', en: 'On Hold' },
  'status.available': { mr: 'उपलब्ध', en: 'Available' },
  'status.inuse': { mr: 'वापरात', en: 'In Use' },
  'status.maintenance': { mr: 'देखभाल', en: 'Maintenance' },

  // Worker
  'worker.id': { mr: 'कर्मचारी क्रमांक', en: 'Worker ID' },
  'worker.name': { mr: 'नाव', en: 'Name' },
  'worker.task': { mr: 'सध्याचे कार्य', en: 'Current Task' },
  'worker.device': { mr: 'उपकरण स्थिती', en: 'Device Status' },
  'worker.ppe': { mr: 'पीपीई तपासणी', en: 'PPE Checklist' },
  'worker.safety': { mr: 'सुरक्षा स्थिती', en: 'Safety Status' },

  // Actions
  'action.approve': { mr: 'मंजूर करा', en: 'Approve' },
  'action.reject': { mr: 'नाकारा', en: 'Reject' },
  'action.hold': { mr: 'रोखा', en: 'Hold' },
  'action.sos': { mr: 'SOS आपत्कालीन', en: 'SOS Emergency' },
  'action.send': { mr: 'पाठवा', en: 'Send' },
  'action.checklist': { mr: 'तपासणी सूची', en: 'Checklist' },

  // Assets
  'asset.id': { mr: 'मालमत्ता क्रमांक', en: 'Asset ID' },
  'asset.type': { mr: 'प्रकार', en: 'Type' },
  'asset.location': { mr: 'स्थान', en: 'Location' },
  'asset.assigned': { mr: 'नियुक्त कर्मचारी', en: 'Assigned Worker' },
  'asset.machine': { mr: 'यंत्र आवश्यकता', en: 'Machine Requirement' },
  'asset.history': { mr: 'इतिहास', en: 'History' },

  // Sensors
  'sensor.h2s': { mr: 'H₂S (हायड्रोजन सल्फाइड)', en: 'H₂S (Hydrogen Sulfide)' },
  'sensor.ch4': { mr: 'CH₄ (मिथेन)', en: 'CH₄ (Methane)' },
  'sensor.co': { mr: 'CO (कार्बन मोनोक्साइड)', en: 'CO (Carbon Monoxide)' },
  'sensor.o2': { mr: 'O₂ (ऑक्सिजन)', en: 'O₂ (Oxygen)' },
  'sensor.temp': { mr: 'तापमान', en: 'Temperature' },
  'sensor.battery': { mr: 'बॅटरी', en: 'Battery' },
  'sensor.source': { mr: 'स्रोत', en: 'Source' },

  // FleetEye
  'fleet.jetting': { mr: 'जेटिंग मशीन', en: 'Jetting Machine' },
  'fleet.rodding': { mr: 'रॉडिंग मशीन', en: 'Rodding Machine' },
  'fleet.sludge': { mr: 'स्लज मशीन', en: 'Sludge Machine' },
  'fleet.crawler': { mr: 'रोबोटिक क्रॉलर', en: 'Robotic Crawler' },
  'fleet.title': { mr: 'फ्लीटआय - यंत्र व्यवस्थापन', en: 'FleetEye - Machine Management' },
  'fleet.total': { mr: 'एकूण', en: 'Total' },

  // VeerPass
  'veerpass.title': { mr: 'वीरपास - मंजुरी प्रणाली', en: 'VeerPass - Approval System' },
  'veerpass.ai': { mr: 'AI शिफारस', en: 'AI Recommendation' },
  'veerpass.manual': { mr: 'मॅन्युअल प्रवेश', en: 'Manual Entry' },
  'veerpass.machine': { mr: 'यंत्र मार्ग', en: 'Machine Route' },

  // BlackBox
  'blackbox.title': { mr: 'वीरब्लॅकबॉक्स - घटना नोंद', en: 'VeerBlackBox - Event Log' },
  'blackbox.event': { mr: 'घटना', en: 'Event' },
  'blackbox.time': { mr: 'वेळ', en: 'Time' },

  // VeerPlan
  'veerplan.title': { mr: 'वीरप्लान - प्रतिबंधक नियोजन', en: 'VeerPlan - Preventive Planning' },
  'veerplan.upcoming': { mr: 'आगामी देखभाल', en: 'Upcoming Maintenance' },
  'veerplan.highrisk': { mr: 'उच्च-जोखीम मालमत्ता', en: 'High-Risk Assets' },
  'veerplan.suggestions': { mr: 'सूचना', en: 'Suggestions' },

  // Comms
  'comms.title': { mr: 'संवाद केंद्र', en: 'Communication Center' },
  'comms.alerts': { mr: 'सूचना', en: 'Alerts' },
  'comms.chat': { mr: 'गप्पा', en: 'Chat' },
  'comms.type_msg': { mr: 'संदेश लिहा...', en: 'Type a message...' },

  // Emergency
  'sos.title': { mr: 'आपत्कालीन नियंत्रण', en: 'Emergency Control' },
  'sos.dispatch': { mr: 'रुग्णवाहिका पाठवली', en: 'Ambulance Dispatched' },
  'sos.active': { mr: 'सक्रिय आपत्कालीन', en: 'Active Emergency' },
  'sos.none': { mr: 'सध्या कोणतीही आपत्कालीन परिस्थिती नाही', en: 'No active emergencies' },
  'sos.press': { mr: 'SOS दाबा', en: 'Press SOS' },
  'sos.worker_distress': { mr: 'कर्मचारी संकटात!', en: 'Worker in distress!' },

  // General
  'general.overview': { mr: 'सारांश', en: 'Overview' },
  'general.details': { mr: 'तपशील', en: 'Details' },
  'general.close': { mr: 'बंद करा', en: 'Close' },
  'general.machine_only': { mr: 'फक्त यंत्र - मॅन्युअल प्रवेश अवरोधित', en: 'Machine Only - Manual Entry Blocked' },
  'general.machine_first': { mr: 'यंत्र प्रथम - सशर्त मॅन्युअल', en: 'Machine First - Conditional Manual' },
  'general.controlled_manual': { mr: 'नियंत्रित मॅन्युअल अनुमती', en: 'Controlled Manual Allowed' },
};

interface LanguageContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'mr',
  toggleLang: () => {},
  t: (key: string) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('mr');

  const toggleLang = useCallback(() => {
    setLang(prev => prev === 'mr' ? 'en' : 'mr');
  }, []);

  const t = useCallback((key: string): string => {
    return translations[key]?.[lang] || key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
