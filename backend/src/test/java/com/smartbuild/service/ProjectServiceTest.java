package com.smartbuild.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.smartbuild.dto.ProjectRequest;
import com.smartbuild.dto.ProjectResponse;
import com.smartbuild.exception.ResourceNotFoundException;
import com.smartbuild.model.Project;
import com.smartbuild.model.ProjectStatus;
import com.smartbuild.repository.ProjectRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;

@ExtendWith(MockitoExtension.class)
class ProjectServiceTest {

    private static final Instant TIMESTAMP = Instant.parse("2026-10-01T10:15:30.123456Z");

    @Mock
    private ProjectRepository projectRepository;

    @InjectMocks
    private ProjectService projectService;

    private ProjectRequest request(ProjectStatus status) {
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
                status);
    }

    private Project project(Long id, String name, ProjectStatus status) {
        Project project = new Project();
        project.setId(id);
        project.setName(name);
        project.setState("Karnataka");
        project.setDistrict("Bengaluru Urban");
        project.setCity("Bengaluru");
        project.setConstructionType("Residential");
        project.setLandAreaSqFt(new BigDecimal("2400.00"));
        project.setBuiltUpAreaSqFt(new BigDecimal("1800.50"));
        project.setFloorCount(2);
        project.setBudget(new BigDecimal("4500000.00"));
        project.setStatus(status);
        project.setCreatedAt(TIMESTAMP);
        project.setUpdatedAt(TIMESTAMP);
        return project;
    }

    @Test
    void createReturnsMappedResponseAndCallsSave() {
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> {
            Project saved = invocation.getArgument(0);
            saved.setId(1L);
            saved.setCreatedAt(TIMESTAMP);
            saved.setUpdatedAt(TIMESTAMP);
            return saved;
        });

        ProjectResponse response = projectService.create(request(ProjectStatus.ACTIVE));

        ArgumentCaptor<Project> captor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(captor.capture());
        Project savedEntity = captor.getValue();
        assertThat(savedEntity.getName()).isEqualTo("Greenfield Villa");
        assertThat(savedEntity.getState()).isEqualTo("Karnataka");
        assertThat(savedEntity.getLandAreaSqFt()).isEqualByComparingTo("2400.00");
        assertThat(savedEntity.getFloorCount()).isEqualTo(2);
        assertThat(savedEntity.getStatus()).isEqualTo(ProjectStatus.ACTIVE);

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.name()).isEqualTo("Greenfield Villa");
        assertThat(response.status()).isEqualTo(ProjectStatus.ACTIVE);
        assertThat(response.createdAt()).isEqualTo(TIMESTAMP);
    }

    @Test
    void createWithNullStatusDefaultsToDraft() {
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        projectService.create(request(null));

        ArgumentCaptor<Project> captor = ArgumentCaptor.forClass(Project.class);
        verify(projectRepository).save(captor.capture());
        assertThat(captor.getValue().getStatus()).isEqualTo(ProjectStatus.DRAFT);
    }

    @Test
    void getAllSortsByCreatedAtDescAndMaps() {
        Project first = project(2L, "Second", ProjectStatus.DRAFT);
        Project second = project(1L, "First", ProjectStatus.ACTIVE);
        Sort expectedSort = Sort.by(Sort.Direction.DESC, "createdAt");
        when(projectRepository.findAll(expectedSort)).thenReturn(List.of(first, second));

        List<ProjectResponse> responses = projectService.getAll();

        verify(projectRepository).findAll(expectedSort);
        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).id()).isEqualTo(2L);
        assertThat(responses.get(0).name()).isEqualTo("Second");
        assertThat(responses.get(1).id()).isEqualTo(1L);
        assertThat(responses.get(1).name()).isEqualTo("First");
        assertThat(responses.get(1).status()).isEqualTo(ProjectStatus.ACTIVE);
        assertThat(responses.get(1).createdAt()).isEqualTo(TIMESTAMP);
    }

    @Test
    void getByIdReturnsProjectWhenFound() {
        when(projectRepository.findById(1L))
                .thenReturn(Optional.of(project(1L, "Greenfield Villa", ProjectStatus.DRAFT)));

        ProjectResponse response = projectService.getById(1L);

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.name()).isEqualTo("Greenfield Villa");
        assertThat(response.status()).isEqualTo(ProjectStatus.DRAFT);
    }

    @Test
    void getByIdThrowsNotFoundWhenMissing() {
        when(projectRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.getById(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Project not found with id 99");
    }

    @Test
    void updateThrowsNotFoundWhenMissing() {
        when(projectRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.update(99L, request(null)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Project not found with id 99");
    }

    @Test
    void updateCopiesFieldsAndKeepsStatusWhenNull() {
        Project existing = project(1L, "Old Name", ProjectStatus.ACTIVE);
        when(projectRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProjectRequest updateRequest = new ProjectRequest(
                "New Name",
                "Maharashtra",
                "Pune",
                "Pune",
                "Commercial",
                new BigDecimal("5000.00"),
                new BigDecimal("3500.00"),
                5,
                null,
                null);

        ProjectResponse response = projectService.update(1L, updateRequest);

        assertThat(existing.getName()).isEqualTo("New Name");
        assertThat(existing.getState()).isEqualTo("Maharashtra");
        assertThat(existing.getDistrict()).isEqualTo("Pune");
        assertThat(existing.getCity()).isEqualTo("Pune");
        assertThat(existing.getConstructionType()).isEqualTo("Commercial");
        assertThat(existing.getLandAreaSqFt()).isEqualByComparingTo("5000.00");
        assertThat(existing.getBuiltUpAreaSqFt()).isEqualByComparingTo("3500.00");
        assertThat(existing.getFloorCount()).isEqualTo(5);
        assertThat(existing.getBudget()).isNull();
        assertThat(existing.getStatus()).isEqualTo(ProjectStatus.ACTIVE);
        assertThat(response.status()).isEqualTo(ProjectStatus.ACTIVE);
        verify(projectRepository).save(existing);
    }

    @Test
    void updateOverridesStatusWhenProvided() {
        Project existing = project(1L, "Old Name", ProjectStatus.DRAFT);
        when(projectRepository.findById(1L)).thenReturn(Optional.of(existing));
        when(projectRepository.save(any(Project.class))).thenAnswer(invocation -> invocation.getArgument(0));

        projectService.update(1L, request(ProjectStatus.COMPLETED));

        assertThat(existing.getStatus()).isEqualTo(ProjectStatus.COMPLETED);
    }

    @Test
    void deleteThrowsNotFoundWhenMissing() {
        when(projectRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> projectService.delete(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Project not found with id 99");
    }

    @Test
    void deleteCallsDeleteWhenFound() {
        Project existing = project(1L, "Greenfield Villa", ProjectStatus.DRAFT);
        when(projectRepository.findById(1L)).thenReturn(Optional.of(existing));

        projectService.delete(1L);

        verify(projectRepository).delete(existing);
    }
}
