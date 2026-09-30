package com.smartbuild.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartbuild.dto.ProjectRequest;
import com.smartbuild.dto.ProjectResponse;
import com.smartbuild.exception.ResourceNotFoundException;
import com.smartbuild.model.ProjectStatus;
import com.smartbuild.service.ProjectService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ProjectController.class)
class ProjectControllerTest {

    private static final Instant TIMESTAMP = Instant.parse("2026-10-01T10:15:30.123456Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private ProjectService projectService;

    private ProjectRequest validRequest() {
        return new ProjectRequest(
                "Greenfield Villa",
                "Karnataka",
                "Bengaluru Urban",
                "Bengaluru",
                "Residential",
                new BigDecimal("2400.00"),
                new BigDecimal("1800.50"),
                2,
                new BigDecimal("4500000.00"),
                ProjectStatus.DRAFT);
    }

    private ProjectResponse response(Long id, String name, ProjectStatus status) {
        return new ProjectResponse(
                id,
                name,
                "Karnataka",
                "Bengaluru Urban",
                "Bengaluru",
                "Residential",
                new BigDecimal("2400.00"),
                new BigDecimal("1800.50"),
                2,
                new BigDecimal("4500000.00"),
                status,
                TIMESTAMP,
                TIMESTAMP);
    }

    @Test
    void createReturns201WithLocationAndBody() throws Exception {
        when(projectService.create(any(ProjectRequest.class)))
                .thenReturn(response(1L, "Greenfield Villa", ProjectStatus.DRAFT));

        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/projects/1"))
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Greenfield Villa"))
                .andExpect(jsonPath("$.state").value("Karnataka"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.budget").value(4500000.00))
                .andExpect(jsonPath("$.createdAt").value(TIMESTAMP.toString()))
                .andExpect(jsonPath("$.updatedAt").value(TIMESTAMP.toString()));

        ArgumentCaptor<ProjectRequest> captor = ArgumentCaptor.forClass(ProjectRequest.class);
        verify(projectService).create(captor.capture());
        assertThat(captor.getValue().name()).isEqualTo("Greenfield Villa");
        assertThat(captor.getValue().status()).isEqualTo(ProjectStatus.DRAFT);
    }

    @Test
    void createWithInvalidBodyReturns400ValidationError() throws Exception {
        ProjectRequest invalid = new ProjectRequest(
                "",
                "Karnataka",
                "Bengaluru Urban",
                "Bengaluru",
                "Residential",
                new BigDecimal("-100.00"),
                new BigDecimal("1800.50"),
                0,
                null,
                null);

        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Validation failed for 3 field(s)"))
                .andExpect(jsonPath("$.fieldErrors").isMap())
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.floorCount").value("must be greater than or equal to 1"))
                .andExpect(jsonPath("$.fieldErrors.landAreaSqFt").value("must be greater than 0"));

        verifyNoInteractions(projectService);
    }

    @Test
    void getAllReturns200WithArray() throws Exception {
        when(projectService.getAll()).thenReturn(List.of(
                response(2L, "Second Villa", ProjectStatus.DRAFT),
                response(1L, "First Villa", ProjectStatus.ACTIVE)));

        mockMvc.perform(get("/api/projects"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].id").value(2))
                .andExpect(jsonPath("$[0].name").value("Second Villa"))
                .andExpect(jsonPath("$[1].id").value(1))
                .andExpect(jsonPath("$[1].status").value("ACTIVE"));
    }

    @Test
    void getByIdReturns200WhenFound() throws Exception {
        when(projectService.getById(1L)).thenReturn(response(1L, "Greenfield Villa", ProjectStatus.DRAFT));

        mockMvc.perform(get("/api/projects/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Greenfield Villa"))
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.budget").value(4500000.00));
    }

    @Test
    void getByIdReturns404WhenMissing() throws Exception {
        when(projectService.getById(99L))
                .thenThrow(ResourceNotFoundException.notFound("Project", 99L));

        mockMvc.perform(get("/api/projects/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Project not found with id 99"))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());
    }

    @Test
    void updateReturns200() throws Exception {
        when(projectService.update(eq(1L), any(ProjectRequest.class)))
                .thenReturn(response(1L, "Updated Villa", ProjectStatus.ACTIVE));

        mockMvc.perform(put("/api/projects/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Updated Villa"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void updateReturns404WhenMissing() throws Exception {
        when(projectService.update(eq(99L), any(ProjectRequest.class)))
                .thenThrow(ResourceNotFoundException.notFound("Project", 99L));

        mockMvc.perform(put("/api/projects/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRequest())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Project not found with id 99"));
    }

    @Test
    void deleteReturns204() throws Exception {
        mockMvc.perform(delete("/api/projects/1"))
                .andExpect(status().isNoContent())
                .andExpect(jsonPath("$").doesNotExist());

        verify(projectService).delete(1L);
    }

    @Test
    void deleteReturns404WhenMissing() throws Exception {
        doThrow(ResourceNotFoundException.notFound("Project", 99L)).when(projectService).delete(99L);

        mockMvc.perform(delete("/api/projects/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Project not found with id 99"));
    }

    @Test
    void malformedJsonReturns400BadRequest() throws Exception {
        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value("Malformed request body"));

        verifyNoInteractions(projectService);
    }

    @Test
    void nonNumericIdReturns400BadRequest() throws Exception {
        mockMvc.perform(get("/api/projects/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value("Invalid value for path variable 'id'"));
    }

    @Test
    void unsupportedMethodReturns405() throws Exception {
        mockMvc.perform(patch("/api/projects/1"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.error").value("METHOD_NOT_ALLOWED"));
    }

    @Test
    void createWithNullBudgetSerializesNull() throws Exception {
        ProjectRequest request = new ProjectRequest(
                "Greenfield Villa",
                "Karnataka",
                "Bengaluru Urban",
                "Bengaluru",
                "Residential",
                new BigDecimal("2400.00"),
                new BigDecimal("1800.50"),
                2,
                null,
                null);
        ProjectResponse noBudget = new ProjectResponse(
                1L, "Greenfield Villa", "Karnataka", "Bengaluru Urban", "Bengaluru",
                "Residential", new BigDecimal("2400.00"), new BigDecimal("1800.50"), 2,
                null, ProjectStatus.DRAFT, TIMESTAMP, TIMESTAMP);
        when(projectService.create(any(ProjectRequest.class))).thenReturn(noBudget);

        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.budget").value(nullValue()))
                .andExpect(jsonPath("$.status").value("DRAFT"));
    }

    @Test
    void createWithOverlongFieldsReturns400() throws Exception {
        ProjectRequest request = new ProjectRequest(
                "x".repeat(151),
                "x".repeat(101),
                "Bengaluru Urban",
                "Bengaluru",
                "Residential",
                new BigDecimal("2400.00"),
                new BigDecimal("1800.50"),
                2,
                null,
                null);

        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.name")
                        .value("must be between 2 and 150 characters"))
                .andExpect(jsonPath("$.fieldErrors.state").value("must be at most 100 characters"));

        verifyNoInteractions(projectService);
    }

    @Test
    void createWithFloorCountAboveMaximumReturns400() throws Exception {
        ProjectRequest request = new ProjectRequest(
                "Greenfield Villa", "Karnataka", "Bengaluru Urban", "Bengaluru",
                "Residential", new BigDecimal("2400.00"), new BigDecimal("1800.50"),
                201, null, null);

        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.floorCount")
                        .value("must be less than or equal to 200"));

        verifyNoInteractions(projectService);
    }

    @Test
    void createWithTooManyDecimalPlacesReturns400() throws Exception {
        ProjectRequest request = new ProjectRequest(
                "Greenfield Villa", "Karnataka", "Bengaluru Urban", "Bengaluru",
                "Residential", new BigDecimal("0.001"), new BigDecimal("1800.50"),
                2, new BigDecimal("4500000.005"), null);

        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors.landAreaSqFt").exists())
                .andExpect(jsonPath("$.fieldErrors.budget").exists());

        verifyNoInteractions(projectService);
    }

    @Test
    void createWithUnknownStatusReturns400BadRequest() throws Exception {
        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Greenfield Villa\",\"state\":\"Karnataka\","
                                + "\"district\":\"Bengaluru Urban\",\"city\":\"Bengaluru\","
                                + "\"constructionType\":\"Residential\",\"landAreaSqFt\":2400,"
                                + "\"builtUpAreaSqFt\":1800,\"floorCount\":2,\"status\":\"BOGUS\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message").value("Malformed request body"));

        verifyNoInteractions(projectService);
    }

    @Test
    void unknownApiPathReturns404NotFound() throws Exception {
        mockMvc.perform(get("/api/does-not-exist"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("NOT_FOUND"))
                .andExpect(jsonPath("$.fieldErrors").doesNotExist());
    }

    @Test
    void unsupportedContentTypeReturns400BadRequest() throws Exception {
        mockMvc.perform(post("/api/projects")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content("name=villa"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("BAD_REQUEST"));

        verifyNoInteractions(projectService);
    }

    @Test
    void errorBodyAlwaysCarriesATimestamp() throws Exception {
        when(projectService.getById(99L))
                .thenThrow(ResourceNotFoundException.notFound("Project", 99L));

        mockMvc.perform(get("/api/projects/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }
}
