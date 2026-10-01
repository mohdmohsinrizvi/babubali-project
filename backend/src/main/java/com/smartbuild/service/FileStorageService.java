package com.smartbuild.service;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

    private final Path rootLocation;
    private static final List<String> ALLOWED_CONTENT_TYPES = List.of(
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp"
    );
    private static final long MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

    public FileStorageService(@Value("${app.upload.dir:uploads}") String uploadDir) {
        this.rootLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.rootLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize upload folder: " + uploadDir, e);
        }
    }

    public String storeFile(Long projectId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Cannot store empty file.");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds maximum limit of 25MB.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException("Invalid file type: " + contentType + ". Only PDF, PNG, JPG, and WEBP are supported.");
        }

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "plan");
        if (originalFilename.contains("..")) {
            throw new IllegalArgumentException("Filename contains invalid path sequence: " + originalFilename);
        }

        try {
            Path projectDir = this.rootLocation.resolve("projects").resolve(String.valueOf(projectId));
            Files.createDirectories(projectDir);

            String extension = "";
            int dotIdx = originalFilename.lastIndexOf('.');
            if (dotIdx > 0) {
                extension = originalFilename.substring(dotIdx);
            }

            String storedFileName = UUID.randomUUID().toString() + extension;
            Path destinationFile = projectDir.resolve(storedFileName).normalize();

            // Security check: ensure file is inside projectDir
            if (!destinationFile.getParent().equals(projectDir)) {
                throw new SecurityException("Cannot store file outside project directory.");
            }

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, destinationFile, StandardCopyOption.REPLACE_EXISTING);
            }

            // Return relative path from rootLocation
            return this.rootLocation.relativize(destinationFile).toString().replace('\\', '/');
        } catch (IOException e) {
            throw new RuntimeException("Failed to store file " + originalFilename, e);
        }
    }

    public Resource loadFileAsResource(String storageReference) {
        try {
            Path filePath = this.rootLocation.resolve(storageReference).normalize();
            if (!filePath.startsWith(this.rootLocation)) {
                throw new SecurityException("Cannot access files outside storage root.");
            }
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            } else {
                throw new RuntimeException("File not found or not readable: " + storageReference);
            }
        } catch (MalformedURLException e) {
            throw new RuntimeException("Invalid file path: " + storageReference, e);
        }
    }

    public void deleteFile(String storageReference) {
        if (!StringUtils.hasText(storageReference)) {
            return;
        }
        try {
            Path filePath = this.rootLocation.resolve(storageReference).normalize();
            if (filePath.startsWith(this.rootLocation)) {
                Files.deleteIfExists(filePath);
            }
        } catch (IOException e) {
            // Log and ignore to prevent failure on cleanup
            System.err.println("Could not delete file at " + storageReference + ": " + e.getMessage());
        }
    }
}
