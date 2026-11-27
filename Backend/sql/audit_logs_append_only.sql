-- Proteksi append-only pada tabel dbo.AUDIT_LOGS
-- Menolak operasi UPDATE dan DELETE di level database.

CREATE OR ALTER TRIGGER TR_AUDIT_LOGS_AppendOnly
ON dbo.AUDIT_LOGS
INSTEAD OF UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    THROW 50010, 'AUDIT_LOGS bersifat append-only.', 1;
END;
GO

-- Opsional: batasi hak akses user aplikasi agar hanya bisa SELECT dan INSERT
-- (Jika user aplikasi bukan pemilik schema/db_owner)
-- REVOKE UPDATE, DELETE ON dbo.AUDIT_LOGS FROM praktikum_user;
-- DENY UPDATE, DELETE ON dbo.AUDIT_LOGS TO praktikum_user;
