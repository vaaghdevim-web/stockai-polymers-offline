package com.svp.stockai.repository;

import com.svp.stockai.entity.AppUser;
import com.svp.stockai.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long> {

    List<UserRole> findByUserAndIsActiveTrue(AppUser user);
}