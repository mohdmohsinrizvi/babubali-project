package com.smartbuild.service;

import com.smartbuild.dto.ProjectRequest;
import com.smartbuild.dto.ProjectResponse;
import com.smartbuild.exception.ResourceNotFoundException;
import com.smartbuild.model.Project;
import com.smartbuild.repository.ProjectRepository;
import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;

    public ProjectService(ProjectRepository projectRepository) {
        this.projectRepository = projectRepository;
    }

    @Transactional
    public ProjectResponse create(ProjectRequest request) {
        Project project = new Project();
        copyRequestToEntity(request, project);
        if (request.status() != null) {
            project.setStatus(request.status());
        }
        Project saved = projectRepository.save(project);
        return ProjectResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<ProjectResponse> getAll() {
        return projectRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(ProjectResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectResponse getById(Long id) {
        return ProjectResponse.from(findOrThrow(id));
    }

    /**
     * Full update: null budget clears the value, while null status keeps the existing one.
     */
    @Transactional
    public ProjectResponse update(Long id, ProjectRequest request) {
        Project project = findOrThrow(id);
        copyRequestToEntity(request, project);
        if (request.status() != null) {
            project.setStatus(request.status());
        }
        Project saved = projectRepository.save(project);
        return ProjectResponse.from(saved);
    }

    @Transactional
    public void delete(Long id) {
        Project project = findOrThrow(id);
        projectRepository.delete(project);
    }

    private Project findOrThrow(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> ResourceNotFoundException.notFound("Project", id));
    }

    private void copyRequestToEntity(ProjectRequest request, Project project) {
        project.setName(request.name());
        project.setState(request.state());
        project.setDistrict(request.district());
        project.setCity(request.city());
        project.setConstructionType(request.constructionType());
        project.setLandAreaSqFt(request.landAreaSqFt());
        project.setBuiltUpAreaSqFt(request.builtUpAreaSqFt());
        project.setFloorCount(request.floorCount());
        project.setBudget(request.budget());
    }
}
