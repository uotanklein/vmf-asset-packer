AddCSLuaFile()
ENT.Type 			= "anim"
ENT.Base 			= "base_anim"

ENT.PrintName		= "Universal Ammo (4 Mags)"
ENT.Author			= "CrunchySoap"
ENT.Category		= "Crunchy's Ultimate Pickups"
ENT.Purpose     = "Ammo here!"
ENT.Spawnable		= true
ENT.AdminOnly		= false

function ENT:SpawnFunction(p,tr)
  local ent = ents.Create("universal_ammo_crate_lg")
  ent:SetPos(tr.HitPos + tr.HitNormal)
  ent:SetAngles(p:GetAngles())
  undo.Create("Universal Ammo")
  undo.AddEntity(ent)
  undo.SetPlayer(p)
  undo.Finish()
  
  ent:SetUseType(SIMPLE_USE)
  ent:Spawn()
  ent:Activate()
end

function ENT:Initialize()
  self:SetModel("models/crunchy/props/nmrih_props/ammo_crate.mdl")
  self:PhysicsInit( SOLID_VPHYSICS )
  self:SetMoveType( MOVETYPE_VPHYSICS )
  self:SetSolid( SOLID_VPHYSICS )
  self.Entity:DrawShadow(true)
  local phys = self:GetPhysicsObject()
  if (phys:IsValid()) then
    phys:Wake()
  end
  
  self.givenAmmo = false
end


function ENT:Touch(p)
  if self.givenAmmo == true then return end
  if not p:IsPlayer() then return end
  
  local wep = p:GetActiveWeapon()
  if not wep:IsValid() then return end
  
  if(wep:GetPrimaryAmmoType() > -1) then
    self.givenAmmo = true
    if wep:GetMaxClip1() <= 0 then
      p:GiveAmmo(2,wep:GetPrimaryAmmoType())
    else
      p:GiveAmmo(wep:GetMaxClip1() * 4,wep:GetPrimaryAmmoType())
    end
    self:Remove()
  end
end
