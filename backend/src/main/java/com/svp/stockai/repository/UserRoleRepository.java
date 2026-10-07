package com.svp.stockai.repository;

import com.svp.stockai.entity.AppUser;
import com.svp.stockai.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long> {

    @Query("""
            SELECT ur
            FROM UserRole ur
            JOIN FETCH ur.role r
            WHERE ur.user = :user
              AND ur.isActive = true
              AND r.isActive = true
            """)
    List<UserRole> findActiveRolesWithActiveRole(@Param("user") AppUser user);
}