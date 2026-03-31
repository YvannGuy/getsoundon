"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { EventType, IndoorOutdoor, VenueType, ServiceNeed } from "@/lib/event-assistant/types";
import { RecommendationInput } from "@/lib/event-assistant/production-types";
import { createRecommendationEngineV2 } from "@/lib/event-assistant/recommendation-engine-v2";
import { 
  convertV2RecommendationToUI,
  enableRecommendationV2,
  isRecommendationV2Enabled,
  compareV1VsV2Recommendations,
  debugRecommendationProcess
} from "@/lib/event-assistant/recommendation-bridge";
import { createEmptyBrief } from "@/lib/event-assistant/brief";

const eventTypes: EventType[] = [
  "conference", "corporate", "birthday", "private_party", "wedding",
  "cocktail", "showcase", "dj_set", "religious_service", "product_launch", "screening"
];

const venueTypes: VenueType[] = [
  "apartment", "hotel", "conference_room", "event_hall", "garden",
  "terrace", "church", "private_home", "outdoor_space", "stage"
];

const serviceNeeds: ServiceNeed[] = [
  "sound", "microphones", "dj", "lighting", "led_screen", "video", "delivery", "installation", "technician"
];

export default function RecommendationEngineDebug() {
  const [input, setInput] = useState<RecommendationInput>({
    eventType: 'conference',
    guestCount: 100,
    indoorOutdoor: 'indoor',
    venueType: 'conference_room'
  });

  const [recommendations, setRecommendations] = useState<any>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [isV2Enabled, setIsV2Enabled] = useState(isRecommendationV2Enabled());
  const [activeTab, setActiveTab] = useState<'v2' | 'comparison'>('v2');

  const engine = createRecommendationEngineV2();

  // Cas d'usage pré-définis pour tests rapides
  const testCases = [
    {
      name: "Conférence 120p intérieur",
      input: {
        eventType: 'conference' as EventType,
        guestCount: 120,
        indoorOutdoor: 'indoor' as IndoorOutdoor,
        venueType: 'conference_room' as VenueType,
        speechExpected: true
      }
    },
    {
      name: "Cocktail 80p hôtel",
      input: {
        eventType: 'cocktail' as EventType,
        guestCount: 80,
        indoorOutdoor: 'indoor' as IndoorOutdoor,
        venueType: 'hotel' as VenueType
      }
    },
    {
      name: "Anniversaire 100p danse",
      input: {
        eventType: 'birthday' as EventType,
        guestCount: 100,
        indoorOutdoor: 'indoor' as IndoorOutdoor,
        venueType: 'private_home' as VenueType,
        dancingExpected: true,
        serviceNeeds: ['sound', 'dj', 'lighting']
      }
    },
    {
      name: "Showcase extérieur couvert",
      input: {
        eventType: 'showcase' as EventType,
        guestCount: 200,
        indoorOutdoor: 'outdoor' as IndoorOutdoor,
        isCovered: true,
        livePerformance: true,
        serviceNeeds: ['sound', 'lighting', 'technician']
      }
    },
    {
      name: "Mariage premium complet",
      input: {
        eventType: 'wedding' as EventType,
        guestCount: 150,
        indoorOutdoor: 'outdoor' as IndoorOutdoor,
        isCovered: true,
        speechExpected: true,
        dancingExpected: true,
        livePerformance: true,
        technicianNeeded: true,
        serviceNeeds: ['sound', 'microphones', 'dj', 'lighting', 'led_screen']
      }
    }
  ];

  const generateRecommendations = () => {
    const recs = engine.generateRecommendations(input);
    setRecommendations(recs);
  };

  const runComparison = () => {
    // Créer un brief équivalent pour comparaison V1 vs V2
    const brief = createEmptyBrief();
    brief.eventType.value = input.eventType || null;
    brief.guestCount.value = input.guestCount || null;
    brief.indoorOutdoor.value = input.indoorOutdoor || null;
    brief.venueType.value = input.venueType || null;
    brief.serviceNeeds.value = input.serviceNeeds || null;
    brief.deliveryNeeded.value = input.deliveryNeeded || null;
    brief.installationNeeded.value = input.installationNeeded || null;
    brief.technicianNeeded.value = input.technicianNeeded || null;

    const comp = compareV1VsV2Recommendations(brief);
    setComparison(comp);
  };

  const toggleV2Engine = () => {
    const newState = !isV2Enabled;
    enableRecommendationV2(newState);
    setIsV2Enabled(newState);
  };

  const loadTestCase = (testCase: typeof testCases[0]) => {
    setInput(testCase.input);
    setRecommendations(null);
    setComparison(null);
  };

  const debugProcess = () => {
    // Debug dans la console
    const brief = createEmptyBrief();
    brief.eventType.value = input.eventType || null;
    brief.guestCount.value = input.guestCount || null;
    brief.indoorOutdoor.value = input.indoorOutdoor || null;
    brief.venueType.value = input.venueType || null;
    brief.serviceNeeds.value = input.serviceNeeds || null;

    debugRecommendationProcess(brief, true);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header et contrôles globaux */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Debug Moteur Recommandation V2</h1>
          <p className="text-muted-foreground">Test et comparaison des recommandations AV</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={`px-2 py-1 rounded text-sm ${isV2Enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
            {isV2Enabled ? "V2 Activé" : "V1 Activé"}
          </div>
          <Button onClick={toggleV2Engine} variant="outline">
            Basculer vers {isV2Enabled ? "V1" : "V2"}
          </Button>
          <Button onClick={debugProcess} variant="outline">
            Debug Console
          </Button>
        </div>
      </div>

      {/* Cas d'usage rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Cas d'Usage de Test</CardTitle>
          <CardDescription>Charger des scénarios pré-définis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {testCases.map((testCase, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => loadTestCase(testCase)}
              >
                {testCase.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulaire de configuration */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration Événement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="eventType" className="block text-sm font-medium mb-2">Type d'événement</label>
                <Select
                  value={input.eventType || ""}
                  onValueChange={(value) => setInput({...input, eventType: value as EventType})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="guestCount" className="block text-sm font-medium mb-2">Nombre d'invités</label>
                <Input
                  id="guestCount"
                  type="number"
                  value={input.guestCount || ""}
                  onChange={(e) => setInput({...input, guestCount: parseInt(e.target.value) || undefined})}
                />
              </div>

              <div>
                <label htmlFor="indoorOutdoor" className="block text-sm font-medium mb-2">Intérieur/Extérieur</label>
                <Select
                  value={input.indoorOutdoor || ""}
                  onValueChange={(value) => setInput({...input, indoorOutdoor: value as IndoorOutdoor})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indoor">Intérieur</SelectItem>
                    <SelectItem value="outdoor">Extérieur</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="venueType" className="block text-sm font-medium mb-2">Type de lieu</label>
                <Select
                  value={input.venueType || ""}
                  onValueChange={(value) => setInput({...input, venueType: value as VenueType})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    {venueTypes.map(venue => (
                      <SelectItem key={venue} value={venue}>{venue}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Intentions */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Intentions</div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="speechExpected"
                      checked={input.speechExpected || false}
                      onChange={(e) => setInput({...input, speechExpected: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="speechExpected" className="text-sm">Prises de parole</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="dancingExpected"
                      checked={input.dancingExpected || false}
                      onChange={(e) => setInput({...input, dancingExpected: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="dancingExpected" className="text-sm">Danse</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="livePerformance"
                      checked={input.livePerformance || false}
                      onChange={(e) => setInput({...input, livePerformance: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="livePerformance" className="text-sm">Performance live</label>
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="space-y-2">
                <div className="text-sm font-medium">Services</div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="technicianNeeded"
                      checked={input.technicianNeeded || false}
                      onChange={(e) => setInput({...input, technicianNeeded: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="technicianNeeded" className="text-sm">Technicien</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="installationNeeded"
                      checked={input.installationNeeded || false}
                      onChange={(e) => setInput({...input, installationNeeded: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="installationNeeded" className="text-sm">Installation</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="deliveryNeeded"
                      checked={input.deliveryNeeded || false}
                      onChange={(e) => setInput({...input, deliveryNeeded: e.target.checked})}
                      className="rounded"
                    />
                    <label htmlFor="deliveryNeeded" className="text-sm">Livraison</label>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={generateRecommendations} className="flex-1">
                  Générer V2
                </Button>
                <Button onClick={runComparison} variant="outline" className="flex-1">
                  Comparer V1/V2
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Résultats */}
        <div className="lg:col-span-2 space-y-4">
          <div className="w-full">
            <div className="flex border-b">
              <button 
                className={`px-4 py-2 border-b-2 ${activeTab === 'v2' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
                onClick={() => setActiveTab('v2')}
              >
                Recommandations V2
              </button>
              <button 
                className={`px-4 py-2 border-b-2 ${activeTab === 'comparison' ? 'border-blue-500 text-blue-600' : 'border-transparent'}`}
                onClick={() => setActiveTab('comparison')}
              >
                Comparaison V1/V2
              </button>
            </div>

            {activeTab === 'v2' && (
              <div className="space-y-4 mt-4">
              {recommendations ? (
                <div className="space-y-4">
                  {recommendations.map((rec: any, index: number) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="capitalize">{rec.tier}</span>
                          <div className="flex gap-2">
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">{rec.complexity}</span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">{rec.setupTime}</span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">{rec.staffingRequired} staff</span>
                          </div>
                        </CardTitle>
                        <CardDescription>
                          {rec.rationale.join(' • ')}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Équipements */}
                          <div className="space-y-2">
                            <h4 className="font-semibold">Équipements</h4>
                            <div className="space-y-1 text-sm">
                              {rec.soundSystem.map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Son</span>
                                  <span>{item.quantity}x {item.label}</span>
                                </div>
                              ))}
                              {rec.microphones.map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">Micro</span>
                                  <span>{item.quantity}x {item.label}</span>
                                </div>
                              ))}
                              {rec.djSetup.map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">DJ</span>
                                  <span>{item.quantity}x {item.label}</span>
                                </div>
                              ))}
                              {rec.lighting.map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">Light</span>
                                  <span>{item.quantity}x {item.label}</span>
                                </div>
                              ))}
                              {rec.video.map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">Video</span>
                                  <span>{item.quantity}x {item.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Services et infos */}
                          <div className="space-y-2">
                            <h4 className="font-semibold">Services</h4>
                            <div className="space-y-1 text-sm">
                              {rec.services.map((service: any, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                  <span 
                                    className={`px-2 py-1 rounded text-xs ${
                                      service.priority === 'required' 
                                        ? 'bg-red-100 text-red-800' 
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {service.priority}
                                  </span>
                                  <span>{service.description}</span>
                                </div>
                              ))}
                            </div>

                            {rec.warnings.length > 0 && (
                              <div className="mt-4">
                                <h4 className="font-semibold text-amber-600">Warnings</h4>
                                <ul className="text-sm text-amber-700 space-y-1">
                                  {rec.warnings.map((warning: string, i: number) => (
                                    <li key={i}>{warning}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {rec.assumptions.length > 0 && (
                              <div className="mt-4">
                                <h4 className="font-semibold text-blue-600">Hypothèses</h4>
                                <ul className="text-sm text-blue-700 space-y-1">
                                  {rec.assumptions.map((assumption: string, i: number) => (
                                    <li key={i}>{assumption}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">Configurer et générer des recommandations</p>
                  </CardContent>
                </Card>
              )}
              </div>
            )}

            {activeTab === 'comparison' && (
              <div className="space-y-4 mt-4">
              {comparison ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* V1 */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Moteur V1 (Actuel)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          {comparison.v1.tiers.map((tier: any, i: number) => (
                            <div key={i}>
                              <h4 className="font-semibold">{tier.title}</h4>
                              <p>Équipements: {tier.items.length}</p>
                              <p>Services: {tier.services.length}</p>
                              <p className="text-muted-foreground text-xs">{tier.rationale}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* V2 */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Moteur V2 (Nouveau)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          {comparison.v2.tiers.map((tier: any, i: number) => (
                            <div key={i}>
                              <h4 className="font-semibold">{tier.title}</h4>
                              <p>Équipements: {tier.items.length}</p>
                              <p>Services: {tier.services.length}</p>
                              <p className="text-muted-foreground text-xs">{tier.rationale}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Analyse des Différences</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <p>
                          <strong>Différence équipements:</strong> {comparison.comparison.equipmentCountDiff.join(', ')}
                        </p>
                        <p>
                          <strong>Différence services:</strong> {comparison.comparison.serviceCountDiff}
                        </p>
                        <div>
                          <strong>Rationales V2:</strong>
                          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {comparison.comparison.rationaleDiff.map((diff: string, i: number) => (
                              <li key={i}>{diff}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">Lancer une comparaison V1/V2</p>
                  </CardContent>
                </Card>
              )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}