const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { GoogleGenerativeAI } = require('@google/generative-ai');

admin.initializeApp();
const db = admin.firestore();

// Note: To use Gemini, ensure GEMINI_API_KEY environment variable is set
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 

// Calculates heuristic delay probability
function calculateRiskScore(weather, traffic, incidentRisk) {
  const score = (weather * 0.4) + (traffic * 0.4) + (incidentRisk * 0.2);
  return Math.min(score, 1.0);
}

exports.onShipmentUpdate = functions.firestore
  .document('shipments/{shipmentId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();

    // Prevent infinite loops
    if (newData.riskScore === oldData.riskScore && newData.status === oldData.status) {
      return null;
    }

    const { target, lat, lng } = newData;
    
    // 1. Simulate fetching real-world data (here we use mock heuristic for hackathon)
    const mockWeatherSeverity = newData.weatherMod || 0.1;
    const mockTrafficCongestion = newData.trafficMod || 0.2;
    const newRiskScore = calculateRiskScore(mockWeatherSeverity, mockTrafficCongestion, 0.1);

    if (newRiskScore > 0.7 && newData.status !== 'rerouted') {
      console.log(`Risk detected for ${context.params.shipmentId}. Initiating swarm reroute...`);
      
      let newTarget = target;
      let newStatus = 'rerouted';
      let aiLogText = '';

      // 2. Swarm Logic / Ghost Node Creation
      // Example: If target is BOM and risk is high, generate HYD ghost node
      if (target === 'BOM') {
        newTarget = 'HYD-GHOST';
        
        // Ensure ghost node exists in DB
        await db.collection('routes').doc('g1').set({ from: 'BLR', to: 'HYD-GHOST', distance: 570 });
        
        try {
          const model = ai.getGenerativeModel({ model: 'gemini-2.5-pro' });
          const result = await model.generateContent(`You are NeuroChain AI. A shipment was heading to Mumbai (BOM) but risk score hit ${(newRiskScore*100).toFixed(0)}% due to bad weather/traffic. We are rerouting via a temporary ghost node in Hyderabad (HYD). Explain this decision concisely in 1-2 sentences.`);
          aiLogText = result.response.text();
        } catch (e) {
          console.error("Gemini AI generation failed:", e);
          aiLogText = "Shipment rerouted due to high congestion in Mumbai. A temporary hub was created in Hyderabad to reduce delay risk.";
        }
      }

      // Generate Alert
      await db.collection('alerts').add({
        message: \`Swarm adjustment for \${context.params.shipmentId}\`,
        type: 'warning',
        time: new Date().toISOString(),
        aiLog: aiLogText
      });

      // Update Shipment
      return change.after.ref.update({
        target: newTarget,
        riskScore: 0.1, // Reset risk after reroute
        status: newStatus
      });
    }

    return null;
});
