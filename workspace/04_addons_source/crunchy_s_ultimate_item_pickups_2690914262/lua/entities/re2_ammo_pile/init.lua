AddCSLuaFile()
ENT.Type 			= "anim"
ENT.Base 			= "base_anim"

ENT.PrintName		= "RE2 Ammo Pile (2 Universal Mags)"
ENT.Author			= "CrunchySoap"
ENT.Category		= "Crunchy's Ultimate Pickups"
ENT.Purpose     = "Ammo here!"
ENT.Spawnable		= true
ENT.AdminOnly		= false

function ENT:SpawnFunction(p,tr)
  local ent = ents.Create("re2_ammo_pile")
  ent:SetPos(tr.HitPos + tr.HitNormal)
  ent:SetAngles(p:GetAngles())
  undo.Create("RE2 Ammo Pile")
  undo.AddEntity(ent)
  undo.SetPlayer(p)
  undo.Finish()
  
  ent:SetUseType(SIMPLE_USE)
  ent:Spawn()
  ent:Activate()
end

function ENT:Initialize()
  self:SetModel("models/crunchy/props/re3_props/ammo_pile_re3.mdl")
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
      p:GiveAmmo(wep:GetMaxClip1() * 2,wep:GetPrimaryAmmoType())
    end
    self:Remove()
  end
end
