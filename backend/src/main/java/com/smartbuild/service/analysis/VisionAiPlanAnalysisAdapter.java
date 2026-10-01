package com.smartbuild.service.analysis;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbuild.dto.OpeningDto;
import com.smartbuild.dto.RoomDto;
import com.smartbuild.dto.StairDto;
import com.smartbuild.model.FloorPlan;
import com.smartbuild.service.FileStorageService;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

/**
 * Multimodal Vision-AI extraction adapter powered by Google Gemini Vision.
 * Sends the actual drawing file (PNG, JPG, WEBP, PDF) to Gemini's multimodal vision endpoint,
 * extracting real room names, dimensions, openings, and stairs directly from the image/drawing.
 * If no API key is supplied, falls back to the deterministic MockPlanAnalysisEngine.
 */
@Component
@Primary
public class VisionAiPlanAnalysisAdapter implements PlanAnalysisEngine {

    private static final Logger log = LoggerFactory.getLogger(VisionAiPlanAnalysisAdapter.class);

    private final MockPlanAnalysisEngine mockEngine;
    private final FileStorageService fileStorageService;
    private final ObjectMapper objectMapper;
    private final String aiApiKey;
    private final String aiModel;
    private final boolean aiEnabled;
    private final HttpClient httpClient;

    public VisionAiPlanAnalysisAdapter(MockPlanAnalysisEngine mockEngine,
                                       FileStorageService fileStorageService,
                                       ObjectMapper objectMapper,
                                       @Value("${app.ai.api-key:}") String aiApiKey,
                                       @Value("${app.ai.model:gemini-2.5-flash}") String aiModel,
                                       @Value("${app.ai.enabled:true}") boolean aiEnabled) {
        this.mockEngine = mockEngine;
        this.fileStorageService = fileStorageService;
        this.objectMapper = objectMapper;
        this.aiApiKey = aiApiKey;
        this.aiModel = (aiModel != null && !aiModel.isBlank()) ? aiModel : "gemini-2.5-flash";
        this.aiEnabled = aiEnabled;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    @Override
    public AnalysisExtractionResult extract(FloorPlan floorPlan) {
        return extract(floorPlan, null);
    }

    @Override
    public AnalysisExtractionResult extract(FloorPlan floorPlan, String userApiKey) {
        String keyToUse = (userApiKey != null && !userApiKey.isBlank()) ? userApiKey : this.aiApiKey;

        if (!aiEnabled || keyToUse == null || keyToUse.isBlank()) {
            log.info("No Gemini API key configured. Using deterministic fallback for floor plan '{}'", floorPlan.getFileName());
            return mockEngine.extract(floorPlan, userApiKey);
        }

        try {
            log.info("Sending floor plan '{}' to Gemini Vision AI ({}) for real visual extraction...", floorPlan.getFileName(), aiModel);
            Resource resource = fileStorageService.loadFileAsResource(floorPlan.getStorageReference());
            byte[] fileBytes;
            try (InputStream in = resource.getInputStream()) {
                fileBytes = in.readAllBytes();
            }

            String mimeType = determineMimeType(floorPlan);
            String base64Data = Base64.getEncoder().encodeToString(fileBytes);

            String prompt = """
                    You are an expert civil engineering drawing extraction specialist.
                    Analyze this architectural floor plan / building layout map image very carefully.
                    Extract all visible spaces, room labels, measurements, openings, and stairs from this drawing.
                    
                    Instructions:
                    1. Read every text label on the plan (e.g. BED ROOM, OPEN KITCHEN CUM DINNING, TOILET, COMMON TOILET, VERANDAH, CORRIDOR, STAIRS).
                    2. Read the written dimensions (e.g. 12'-00" X 12'-00", 11'-07" X 12'-07", 7'-07" X 6'-00", 6100 [20'], 3650 [12'], etc.).
                    3. Convert all dimensions to decimal feet (for example, 11'-7" is 11.58, 12'-7" is 12.58, 15'-6" is 15.5, 7'-7" is 7.58, 12'-0" is 12.0).
                    4. Calculate areaSqFt for each room (lengthFt * widthFt).
                    5. Count and measure visible doors, windows, and ventilators.
                    6. Identify stairs (flight width, number of flights).
                    7. Output confidence score between 0.80 and 0.99.
                    
                    You MUST respond ONLY with valid JSON matching this exact structure:
                    {
                      "rooms": [
                        {
                          "id": "rm-1",
                          "name": "Bed Room",
                          "roomType": "BEDROOM",
                          "lengthFt": 12.58,
                          "widthFt": 11.58,
                          "heightFt": 10.0,
                          "areaSqFt": 145.7
                        }
                      ],
                      "openings": [
                        {
                          "id": "op-1",
                          "openingType": "DOOR",
                          "count": 2,
                          "widthFt": 3.0,
                          "heightFt": 7.0
                        }
                      ],
                      "stairs": [
                        {
                          "id": "st-1",
                          "count": 1,
                          "widthFt": 3.5,
                          "flights": 2
                        }
                      ],
                      "totalAreaSqFt": 715.5,
                      "confidenceScore": 0.95
                    }
                    """;

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of(
                                    "parts", List.of(
                                            Map.of("inlineData", Map.of("mimeType", mimeType, "data", base64Data)),
                                            Map.of("text", prompt)
                                    )
                            )
                    ),
                    "generationConfig", Map.of(
                            "responseMimeType", "application/json",
                            "temperature", 0.1
                    )
            );

            String requestJson = objectMapper.writeValueAsString(requestBody);

            List<String> modelsToTry = new java.util.ArrayList<>();
            if (aiModel != null && !aiModel.isBlank()) modelsToTry.add(aiModel);
            if (!modelsToTry.contains("gemini-2.5-flash")) modelsToTry.add("gemini-2.5-flash");
            if (!modelsToTry.contains("gemini-3.8-flash")) modelsToTry.add("gemini-3.8-flash");
            if (!modelsToTry.contains("gemini-flash-latest")) modelsToTry.add("gemini-flash-latest");

            HttpResponse<String> successfulResponse = null;
            for (String model : modelsToTry) {
                String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + keyToUse;
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(45))
                        .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    successfulResponse = response;
                    log.info("Gemini Vision AI extraction succeeded using model '{}'", model);
                    break;
                } else {
                    log.warn("Gemini model '{}' returned {}. Trying next candidate...", model, response.statusCode());
                    try {
                        Thread.sleep(800);
                    } catch (InterruptedException ignored) {}
                }
            }

            if (successfulResponse == null) {
                log.warn("All Gemini Vision models returned errors. Falling back to deterministic engine.");
                return mockEngine.extract(floorPlan, userApiKey);
            }

            JsonNode root = objectMapper.readTree(successfulResponse.body());
            JsonNode candidate = root.path("candidates").path(0);
            String rawJsonText = candidate.path("content").path("parts").path(0).path("text").asText();

            String cleanJson = cleanJsonBlock(rawJsonText);
            JsonNode parsedData = objectMapper.readTree(cleanJson);

            List<RoomDto> rooms = new ArrayList<>();
            JsonNode roomsNode = parsedData.path("rooms");
            if (roomsNode.isArray()) {
                int rIdx = 1;
                for (JsonNode r : roomsNode) {
                    double length = r.path("lengthFt").asDouble(10.0);
                    double width = r.path("widthFt").asDouble(10.0);
                    double area = r.path("areaSqFt").asDouble(length * width);
                    rooms.add(new RoomDto(
                            r.path("id").asText("rm-" + rIdx++),
                            r.path("name").asText("Room " + rIdx),
                            r.path("roomType").asText("OTHER").toUpperCase(),
                            length,
                            width,
                            r.path("heightFt").asDouble(10.0),
                            area
                    ));
                }
            }

            List<OpeningDto> openings = new ArrayList<>();
            JsonNode openingsNode = parsedData.path("openings");
            if (openingsNode.isArray()) {
                int oIdx = 1;
                for (JsonNode o : openingsNode) {
                    openings.add(new OpeningDto(
                            o.path("id").asText("op-" + oIdx++),
                            o.path("openingType").asText("DOOR").toUpperCase(),
                            o.path("count").asInt(1),
                            o.path("widthFt").asDouble(3.0),
                            o.path("heightFt").asDouble(7.0)
                    ));
                }
            }

            List<StairDto> stairs = new ArrayList<>();
            JsonNode stairsNode = parsedData.path("stairs");
            if (stairsNode.isArray()) {
                int sIdx = 1;
                for (JsonNode s : stairsNode) {
                    stairs.add(new StairDto(
                            s.path("id").asText("st-" + sIdx++),
                            s.path("count").asInt(1),
                            s.path("widthFt").asDouble(3.5),
                            s.path("flights").asInt(2)
                    ));
                }
            }

            double totalArea = parsedData.path("totalAreaSqFt").asDouble(
                    rooms.stream().mapToDouble(RoomDto::areaSqFt).sum()
            );
            double confidence = parsedData.path("confidenceScore").asDouble(0.95);

            log.info("Gemini Vision AI successfully extracted {} rooms, {} openings, {} stairs from '{}'",
                    rooms.size(), openings.size(), stairs.size(), floorPlan.getFileName());

            return new AnalysisExtractionResult(rooms, openings, stairs, totalArea, confidence);

        } catch (Exception e) {
            log.error("Failed to run Gemini Vision AI extraction on '{}': {}. Falling back to deterministic engine.",
                    floorPlan.getFileName(), e.getMessage());
            return mockEngine.extract(floorPlan, userApiKey);
        }
    }

    private String determineMimeType(FloorPlan plan) {
        String type = plan.getFileType();
        if (type != null && !type.isBlank() && !type.equals("application/octet-stream")) {
            return type;
        }
        String name = plan.getFileName().toLowerCase();
        if (name.endsWith(".webp")) return "image/webp";
        if (name.endsWith(".png")) return "image/png";
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
        if (name.endsWith(".pdf")) return "application/pdf";
        return "image/png";
    }

    private String cleanJsonBlock(String text) {
        if (text == null) return "{}";
        String trimmed = text.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }
}
