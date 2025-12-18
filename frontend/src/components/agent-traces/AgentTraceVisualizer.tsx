import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";

// @ts-ignore - vis-network types may not be available
import { Network, DataSet } from "vis-network/standalone";

interface TraceStep {
  type: string;
  timestamp: number;
  field_name: string;
  iteration?: number;
  data?: Record<string, any>;
  [key: string]: any;
}

interface ChunkData {
  chunk_id: string;
  content: string;
  file_name: string;
  file_id: string;
}

export function AgentTraceVisualizer() {
  const { tenderId } = useParams<{ tenderId: string }>();
  const networkRef = useRef<HTMLDivElement>(null);
  const [network, setNetwork] = useState<Network | null>(null);
  const [traces, setTraces] = useState<Record<string, TraceStep[]>>({});
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStep, setSelectedStep] = useState<TraceStep | null>(null);

  useEffect(() => {
    if (!tenderId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load traces - using direct fetch for now until API types are generated
        const tracesResponse = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/agent-traces/${tenderId}`
        );
        if (!tracesResponse.ok) {
          throw new Error(`Failed to load traces: ${tracesResponse.status}`);
        }
        const tracesData = await tracesResponse.json();
        setTraces(tracesData);

        // Select first field if available
        const fields = Object.keys(tracesData);
        if (fields.length > 0 && !selectedField) {
          setSelectedField(fields[0]);
        }

        setLoading(false);
      } catch (err: any) {
        setError(err.message || "Failed to load traces");
        setLoading(false);
      }
    };

    loadData();
  }, [tenderId, selectedField]);

  useEffect(() => {
    if (!selectedField || !traces[selectedField] || !networkRef.current) return;

    const visualizeTrace = () => {
      const trace = traces[selectedField];
      if (!trace || trace.length === 0) return;

      const nodesData: any[] = [];
      const edgesData: any[] = [];
      const nodeMap: Record<number, string> = {};

      trace.forEach((step, index) => {
        const nodeId = `step-${index}`;
        let label = step.type;
        let color = "#2196f3";
        let shape = "box";

        // Customize node appearance based on step type
        switch (step.type) {
          case "start":
            color = "#4caf50";
            label = "Start";
            break;
          case "initial_search":
            color = "#9c27b0";
            label = `Initial Search\n(${step.data?.chunks_found || 0} chunks)`;
            break;
          case "llm_call":
            color = "#2196f3";
            label = `LLM Call\n(Iteration ${step.iteration || step.data?.iteration || "?"})`;
            break;
          case "llm_response":
            color = "#03a9f4";
            label = `LLM Response\n(Iteration ${step.iteration || step.data?.iteration || "?"})`;
            break;
          case "tool_calls_start":
            color = "#ff9800";
            label = `Tool Calls\n(${step.data?.tool_calls_count || 0} tools)`;
            break;
          case "tool_call":
            color = "#ff9800";
            label = `Tool: ${step.data?.tool_name || "Unknown"}`;
            shape = "diamond";
            break;
          case "tool_error":
            color = "#f44336";
            label = `Error: ${step.data?.tool_name || "Unknown"}`;
            shape = "diamond";
            break;
          case "final_result":
            color = "#00bcd4";
            label = "Final Result";
            shape = "ellipse";
            break;
          case "max_iterations_reached":
            color = "#f44336";
            label = "Max Iterations";
            break;
        }

        nodesData.push({
          id: nodeId,
          label: label,
          color: color,
          shape: shape,
          stepIndex: index,
          step: step,
        });

        nodeMap[index] = nodeId;

        // Create edges
        if (index > 0) {
          edgesData.push({
            from: nodeMap[index - 1],
            to: nodeId,
            arrows: "to",
            smooth: { type: "curvedCW", roundness: 0.2 },
          });
        }
      });

            const data = {
                nodes: new DataSet(nodesData),
                edges: new DataSet(edgesData),
            };

            const options = {
              nodes: {
                font: { size: 14 },
                borderWidth: 2,
                shadow: true,
              },
                edges: {
                  width: 2,
                  color: { color: "#848484" },
                  smooth: {
                    enabled: true,
                    type: "curvedCW",
                    roundness: 0.2,
                  },
                },
                layout: {
                    hierarchical: {
                        direction: "LR",
                        sortMethod: "directed",
                        levelSeparation: 150,
                        nodeSpacing: 200,
                        treeSpacing: 200,
                    },
                },
                physics: {
                    enabled: false,
                },
                interaction: {
                    hover: true,
                    tooltipDelay: 100,
                },
            };

            if (!networkRef.current) return;
            const net = new Network(networkRef.current, data, options);

      // Add click handler
      net.on("click", function (params: any) {
        if (params.nodes.length > 0) {
          const nodeId = params.nodes[0];
          const node = nodesData.find((n) => n.id === nodeId);
          if (node) {
            setSelectedStep(node.step);
          }
        }
      });

      // Fit network after a short delay
      setTimeout(() => {
        net.fit({ animation: false });
      }, 100);

      setNetwork(net);
    };

    visualizeTrace();
  }, [selectedField, traces]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="p-6">
          <div className="text-red-500">Error: {error}</div>
        </Card>
      </div>
    );
  }

  const fields = Object.keys(traces);

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-background py-3 px-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Agent Trace Visualizer</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => network?.fit({ animation: false })}
          >
            Reset View
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Sidebar */}
        <div className="w-64 border-r bg-muted/30 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold mb-4">Fields</h2>
            <div className="space-y-2">
              {fields.map((field) => {
                const trace = traces[field];
                const lastStep = trace[trace.length - 1];
                const isComplete = lastStep?.type === "final_result";
                const isSelected = selectedField === field;

                return (
                  <div
                    key={field}
                    onClick={() => setSelectedField(field)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-background border-2 border-transparent hover:bg-muted"
                    }`}
                  >
                    <div className="font-medium text-sm">{field}</div>
                    <div
                      className={`text-xs mt-1 ${
                        isComplete ? "text-green-600" : "text-orange-600"
                      }`}
                    >
                      {isComplete ? "✓ Complete" : "In Progress"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-3 bg-background rounded-lg">
              <h3 className="text-xs font-semibold mb-2">Legend</h3>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  <span>Start</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-blue-500"></div>
                  <span>LLM Call</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-orange-500"></div>
                  <span>Tool Call</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-500"></div>
                  <span>Chunk Retrieval</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span>Error</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-cyan-500"></div>
                  <span>Final Result</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main visualization */}
        <div className="flex-1 min-h-0 relative">
          <div ref={networkRef} className="w-full h-full" />
        </div>

        {/* Details panel */}
        {selectedStep && (
          <div className="w-96 border-l bg-background overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Step Details</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedStep(null)}
                >
                  ×
                </Button>
              </div>
              <StepDetails step={selectedStep} tenderId={tenderId || ""} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepDetails({ step, tenderId }: { step: TraceStep; tenderId: string }) {
  const [chunkData, setChunkData] = useState<ChunkData | null>(null);

  useEffect(() => {
    const loadChunk = async () => {
      if (step.data?.chunk_ids && step.data.chunk_ids.length > 0) {
        try {
          const chunkId = step.data.chunk_ids[0];
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL}/agent-traces/${tenderId}/chunks/${chunkId}`
          );
          if (response.ok) {
            const data = await response.json();
            setChunkData(data);
          }
        } catch (err) {
          console.error("Error loading chunk:", err);
        }
      }
    };

    loadChunk();
  }, [step, tenderId]);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm font-medium">Type</div>
        <div className="text-sm text-muted-foreground">{step.type}</div>
      </div>

      <div>
        <div className="text-sm font-medium">Timestamp</div>
        <div className="text-sm text-muted-foreground">
          {new Date(step.timestamp * 1000).toLocaleString()}
        </div>
      </div>

      {step.iteration && (
        <div>
          <div className="text-sm font-medium">Iteration</div>
          <div className="text-sm text-muted-foreground">{step.iteration}</div>
        </div>
      )}

      {step.data && (
        <div>
          <div className="text-sm font-medium">Data</div>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-64">
            {JSON.stringify(step.data, null, 2)}
          </pre>
        </div>
      )}

      {chunkData && (
        <div>
          <div className="text-sm font-medium">Chunk Content</div>
          <div className="text-xs bg-muted p-2 rounded overflow-auto max-h-64">
            <div className="font-medium mb-1">{chunkData.chunk_id}</div>
            <div className="text-muted-foreground mb-2">
              File: {chunkData.file_name}
            </div>
            <div>{chunkData.content.substring(0, 500)}...</div>
          </div>
        </div>
      )}
    </div>
  );
}

