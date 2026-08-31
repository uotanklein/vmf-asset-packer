local PermaAll = {}
local Perma_KeyValueSyncTable = nil
util.AddNetworkString("PermaAll.Halo")
PermaAll_MasterTable = PermaAll_MasterTable or {}

timer.Simple(0, function()
    PermaAll_MasterTable = Perma_LoadFromFile()
end)

-- CreateConVar( "_permaall_respawn_speed", "1", FCVAR_ARCHIVE, "", 1, 10 )
local function print_admin(p, s)
    if not IsValid(p) then return end
    p:PrintMessage(HUD_PRINTCONSOLE, s)
end

local function print_admins(s)
    for _, p in pairs(player.GetAll()) do
        if not p:IsAdmin() then continue end
        p:PrintMessage(HUD_PRINTCONSOLE, s)
    end
end

-- local function netYellow(p, e)
--     net.Start("PermaAll.Halo")
--     net.WriteEntity(e)
--     net.WriteColor(Color(150, 150, 0))
--     net.Send(p)
-- end
-- local function netRed(p, e)
--     net.Start("PermaAll.Halo")
--     net.WriteEntity(e)
--     net.WriteColor(Color(255, 0, 0))
--     net.Send(p)
-- end
-- local function netGreen(p, e)
--     net.Start("PermaAll.Halo")
--     net.WriteEntity(e)
--     net.WriteColor(Color(0, 255, 0))
--     net.Send(p)
-- end
-- doesnt remove from perma table just from the map 
function Perma_RemoveEntities(p)
    if not Perma_HasAccess(p) then return end

    if timer.Exists("permaall_spawning") then
        if IsValid(p) then
            p:ChatNotify("[PermaAll] Entities still spawning, Please Wait!")
        end

        return
    end

    if IsValid(p) then
        p:ChatNotify("[PermaAll] Respawning all Perma entities!")
    end

    local time = math.ceil(0.025 * table.Count(PermaAll_MasterTable))
    local entTbl = ents.GetAll()
    local MaxTbl = table.Count(entTbl)
    local RemCount = 0

    for i = 1, MaxTbl do
        e = entTbl[i]

        if IsValid(e) and e.PermaID then
            e:Remove()
            RemCount = RemCount + 1
        end

        if i == MaxTbl then
            print("[PermaAll] removed : " .. RemCount .. " Perma entities.")
        end
    end

    if IsValid(p) then
        p:ConCommand("PermaAll_RespawningNotify " .. time)
    end
end

function Perma_HasAccess(p, b)
    if IsValid(p) and (b and not p:IsAdmin()) then
        p:ChatNotify("[PermaAll] You need admin for this feature, sorry!")

        return false
    end

    return true
end

function Perma_RespawnEntities(p)
    Perma_RemoveEntities(p)
    PermaAll_MasterTable = Perma_LoadFromFile()
    Perma_SpawnEntities(p)
end

function Perma_SpawnEntities(p)
    if not Perma_HasAccess(p) then return end

    if not file.Exists("perma/" .. string.lower(game.GetMap()) .. "_objects.txt", "DATA") then
        print("[PermaAll] no spawn file found for : " .. string.lower(game.GetMap()))
        file.CreateDir("perma")
        file.Write("perma/" .. string.lower(game.GetMap()) .. "_objects.txt", "DATA")
        print("[PermaAll] created empty stock file for : " .. string.lower(game.GetMap()))
    else
        print("[PermaAll] Spawning perma objects...")
        local tbl = PermaAll_MasterTable
        if not tbl then return end
        local CurCount = 1
        local MaxCount = table.Count(tbl)

        timer.Create("permaall_spawning", .025, 0, function()
            local v = tbl[CurCount]

            if v then
                local ent = duplicator.Paste(NULL, {v}, {})

                if (ent and istable(ent) and IsValid(ent[1])) then
                    local e = ent[1]
                    e.PermaID = v.ID
                    e:SetNWBool("IsPermaEntity", true)
                    e:SetNWString("_PermaUID", v.ID)

                    if v.VehicleTable and v.VehicleTable.KeyValues and v.VehicleTable.KeyValues.vehiclescript then
                        timer.Simple(1, function()
                            e:SetKeyValue("vehiclescript", v.VehicleTable.KeyValues.vehiclescript)
                            e:Spawn()
                            e:Activate()
                        end)
                    end

                    local message = ("[PermaAll] Object index (" .. CurCount .. " / " .. #tbl .. ") of class type ( " .. v.Class .. " ) spawned")
                    print(message)
                    print_admin(p, message)
                else
                    local message = ("[PermaAll] Object index (" .. CurCount .. " / " .. #tbl .. ") of class type ( " .. v.Class .. " ) has been unlinked/removed unexpectedly!")
                    print(message)
                    print_admins(message)
                end
            end

            if CurCount >= MaxCount then
                timer.Remove("permaall_spawning")
            else
                CurCount = CurCount + 1
            end
        end)

        print("[PermaAll] Spawned : " .. table.Count(tbl) .. " perma objects.")
    end
end

-- function Perma_Init(action, p)
-- unused (being removed)
-- return
-- end
hook.Add("PostCleanupMap", "LoadAllPermaObjects", Perma_RespawnEntities)
hook.Add("InitPostEntity", "LoadAllPermaObjects", Perma_RespawnEntities)
concommand.Add("permaall_respawn_all", Perma_RespawnEntities)

if CLIENT then
    concommand.Add("PermaAll_RespawningNotify", function(p, _, t)
        local i = t[1] and tonumber(t[1])
        if not i then return end
        notification.AddProgress("PermaAllRespawn", "[PermaAll] Respawning")

        timer.Simple(i, function()
            notification.Kill("PermaAllRespawn")
        end)
    end)
end

concommand.Add("permaall_gotoid", function(p, cmd, args)
    if not IsValid(p) or not Perma_HasAccess(p) then return end
    local id = args[1]

    if id then
        for k, v in pairs(ents.GetAll()) do
            if v.PermaID then
                if v.PermaID == id then
                    p:SetPos(v:GetPos())
                    local ang = v:GetAngles()
                    ang.p = 0
                    ang.r = 0
                    p:SetEyeAngles(ang)
                    break
                end
            end
        end
    end
end)

concommand.Add("permaall_removeid", function(p, _, t)
    if not IsValid(p) or not Perma_HasAccess(p) then return end
    print(p, t)
    local s = t[1]

    if s then
        local id = string.upper(s or "")

        -- check current entities before checking through the perma table
        for k, v in pairs(ents.GetAll()) do
            if v.PermaID then
                if v.PermaID == id then
                    print("FOUND AS ENTITY")
                    Perma_Remove(p, v)

                    return
                end
            end
        end

        -- no entity with the id found now check through the perma table
        for k, t in pairs(PermaAll_MasterTable) do
            if t and t.ID == id then
                print("FOUND IN FILE")
                PermaAll_MasterTable[k] = nil
                Perma_SaveToFile()

                return
            end
        end
    end

    print("PERMA HAS NOTHING WITH THE ID (" .. (s or "<MISSING>") .. ")")
end)

function Perma_RemoveGhostEntries(t)
    local _t = {}

    for k, v in pairs(t or {}) do
        table.insert(_t, v)
    end

    return _t
end

function Perma_LoadFromFile()
    local t = {}
    local s = file.Read("perma/" .. string.lower(game.GetMap()) .. "_objects.txt")
    local t = s and util.JSONToTable(s)

    if not t then
        t = {}
    end

    t = Perma_RemoveGhostEntries(t)

    return t
end

function Perma_SaveToFile(b)
    -- if !t then return end
    if not b then
        timer.Create("PermaAll.Queue.Set.File", 1, 1, function()
            Perma_SaveToFile(true)
        end)

        return
    end

    Perma_KeyValueSyncTable = nil
    PermaAll_MasterTable = Perma_RemoveGhostEntries(PermaAll_MasterTable)
    local s = util.TableToJSON(PermaAll_MasterTable)
    file.Write("perma/" .. string.lower(game.GetMap()) .. "_objects.txt", s)
end

function Perma_Log(p, s)
    if p:IsAdmin() then
        p:ChatNotify("[PERMA LOG] : " .. s)
    end
end

function Perma_StringRandom(int)
    -- math.randomseed(os.time())
    local s = ""

    for i = 1, int do
        s = s .. string.char(math.random(65, 90))
    end

    return s
end

-- internal way of saving target entity
function Perma_SaveEntity(e)
    if e.PermaID ~= nil then return end
    local dupe = duplicator.Copy(e)

    --FASTER/ BETTER PERFORMANCE
    if table.HasValue(table.GetKeys(dupe.Entities), e:EntIndex()) then
        data = dupe.Entities[e:EntIndex()]
        data.ID = Perma_StringRandom(10)
        e.PermaID = data.ID
        e:SetNWBool("IsPermaEntity", true)
        e:SetNWString("_PermaUID", data.ID)
        -- if IsValid(p) then
        -- netGreen(p, e)
        -- end
        table.insert(PermaAll_MasterTable, data)
    end

    Perma_SaveToFile() -- already saves on a timer
end

-- internal way of removing target entity
function Perma_RemoveEntity(e)
    if not IsValid(e) then return end
    if not e.PermaID then return end

    for k, v in pairs(PermaAll_MasterTable or {}) do
        if v.ID == e.PermaID then
            PermaAll_MasterTable[k] = nil
            e.PermaID = nil
            local int = IsValid(p) and p:GetInfoNum("permaall_removeclick", 0) or 0

            if int >= 1 then
                e:Remove()
            else
                e:SetNWBool("IsPermaEntity", false)
                e:SetNWString("_PermaUID", "")
                -- if IsValid(p) then
                -- netRed(p, e)
                -- end
            end
        end
    end

    Perma_SaveToFile()
end

function Perma_Add(p, e)
    if not Perma_ValidUse(p, e, "add") then return end
    if e.BeingPermaed then return end

    if timer.Exists("perma.constrained.timer." .. tostring(p)) then
        local timeLeft = math.Round(timer.TimeLeft("perma.constrained.timer." .. tostring(p)) or 0)
        p:ChatNotify("[PermaAll] Still saving constrained entities, Please Wait (" .. timeLeft .. " second/s )")

        return
    end

    local tbl = PermaAll_MasterTable
    local data
    local dupe = duplicator.Copy(e)
    local objects = {}

    if IsValid(p) and p:KeyDown(IN_USE) then
        objects = constraint.GetAllConstrainedEntities(e)

        -- custom entity grouping
        for _, ee in pairs(ents.GetAll()) do
            if e == ee then continue end
            if not e.PermaGroupID then break end
            if not ee.PermaGroupID then continue end
            if e.PermaGroupID ~= ee.PermaGroupID then continue end
            table.insert(objects, ee)
        end
    else
        objects = {e}
    end

    local group = (table.Count(objects) or 0) > 1
    local delay = not group and 0 or .05
    local calcedDelay = (group and table.Count(objects) * delay or 0)

    if calcedDelay then
        timer.Create("perma.constrained.timer." .. tostring(p), calcedDelay, 1, function() end)
    end

    local groupID = group and math.random(11111111, 99999999)
    local i = 0

    for _, e in pairs(objects) do
        e.BeingPermaed = true
        i = i + delay

        timer.Simple(i, function()
            e.BeingPermaed = nil

            if group then
                e.PermaGroupID = groupID

                duplicator.StoreEntityModifier(e, "PermaGroupID", {groupID})
            end

            Perma_SaveEntity(e)
        end)
    end

    if istable(objects) and table.Count(objects) > 1 then
        local timeLeft = math.Round(timer.TimeLeft("perma.constrained.timer." .. tostring(p)) or 0)

        if IsValid(p) then
            p:ChatNotify("[PermaAll] (" .. table.Count(objects) .. ") Entities Being Added! (" .. timeLeft .. " second/s )")
        end
    else
        if IsValid(p) then
            p:ChatNotify("[PermaAll] Entity Added!")
        end
    end

    if IsValid(p) then
        Perma_QueueNet(p)
    end
end

function Perma_Remove(p, e)
    if not Perma_ValidUse(p, e, "remove") then return end
    if e.BeingPermaed then return end

    if timer.Exists("perma.constrained.timer." .. tostring(p)) then
        local timeLeft = math.Round(timer.TimeLeft("perma.constrained.timer." .. tostring(p)) or 0)
        p:ChatNotify("[PermaAll] Still removing constrained entities, Please Wait (" .. timeLeft .. " second/s )")

        return
    end

    local objects

    if IsValid(p) and p:KeyDown(IN_USE) then
        objects = constraint.GetAllConstrainedEntities(e)

        -- custom entity grouping
        for _, ee in pairs(ents.GetAll()) do
            if e == ee then continue end
            if not e.PermaGroupID then break end
            if not ee.PermaGroupID then continue end
            if e.PermaGroupID ~= ee.PermaGroupID then continue end
            table.insert(objects, ee)
        end
    else
        objects = {e}
    end

    local group = table.Count(objects)
    local delay = not group and 0 or .05
    local calcedDelay = (group and table.Count(objects) * delay or 0)

    if calcedDelay then
        timer.Create("perma.constrained.timer." .. tostring(p), calcedDelay, 1, function() end)
    end

    local i = 0

    for _, e in pairs(objects) do
        e.BeingPermaed = true
        i = i + delay

        timer.Simple(i, function()
            e.BeingPermaed = nil
            Perma_RemoveEntity(e)
        end)
    end

    if istable(objects) and table.Count(objects) > 1 then
        local timeLeft = math.Round(timer.TimeLeft("perma.constrained.timer." .. tostring(p)) or 0)
        p:ChatNotify("[PermaAll] (" .. table.Count(objects) .. ") Entities Being Removed! (" .. timeLeft .. " second/s )")
    else
        p:ChatNotify("[PermaAll] Entity Removed!")
    end

    if IsValid(p) then
        Perma_QueueNet(p)
    end
end

-- s = action (add/ remove)
function Perma_ValidUse(p, e, s)
    if not IsValid(p) or not p:IsAdmin() then
        p:ChatNotify("[PermaAll] You are not allowed to do this!")

        return false
    end

    if not IsValid(e) then
        p:ChatNotify("[PermaAll] Invalid entity!")

        return false
    end

    if e.bNoPersist or e.IsDrGNextbot or e:IsNextBot() or (e:GetClass() ~= "animprop_generic" and e:IsNPC()) or e:IsPlayer() or e:CreatedByMap() then
        p:ChatNotify("[PermaAll] This entity type is blacklisted!")

        return false
    end

    -- if !e.PermaWait then e.PermaWait = CurTime() + 0
    -- elseif PermaWait > CurTime() then return end
    local blacklist = {
        ["ix_container"] = true,
        ["ix_item"] = true,
        ["ix_safebox"] = true,
        ["ix_belongings"] = true,
        ["ix_vendor"] = true,
        ["ix_talker"] = true,
        ["ix_teledoor"] = true,
        ["npc_spawner"] = true,
        ["ix_paper"] = true,
        ["ix_generator"] = true,
        ["ix_light"] = true,
        ["ix_cassette_player"] = true,
        ["ix_station"] = true,
        ["prop_door_rotating"] = true,
        ["prop_dynamic"] = true,
        ["func_breakable"] = true,
        ["func_door"] = true,
        ["mappatcher_brush"] = true,
        ["player_gear"] = true,
        ["player_gearhandler"] = true,
        ["player_part"] = true
    }

    if blacklist[e:GetClass()] then
        p:ChatNotify("[PermaAll] This entity type is blacklisted!")

        return false
    end

    if s == "add" and e.PermaID then return false end -- netYellow(p, e)
    if s == "remove" and not e.PermaID then return false end -- netYellow(p, e)

    return true
end

function Perma_ClearTable(p)
    local steamIDs = {
        ["STEAM_0:1:67819645"] = true,
        ["STEAM_0:1:96573936"] = true
    }

    -- if not IsValid(p) or not Perma_HasAccess(p, true) then return end
    if not IsValid(p) or not steamIDs[p:SteamID()] then return end

    if timer.Exists("permaall_spawning") then
        p:ChatNotify("[PermaAll] Entities Still Spawning, Please Wait!")

        return
    end

    local a = p:GetInfoNum("permaall_secure1", 0)

    if a < 1 then
        p:ChatNotify("[PermaAll] Check the 'Safety' Box First!")

        if a >= 1 then
            p:ConCommand("permaall_secure1 0")
        end

        return
    end

    if file.Exists("perma/" .. string.lower(game.GetMap()) .. "_objects.txt", "DATA") then
        p:ChatNotify("[PermaAll] Perma Table Cleared!")
        print("[PermaAll] " .. p:Nick() .. " (" .. p:SteamID() .. ") : Cleared The Perma Table For : " .. string.lower(game.GetMap()))
        PermaAll_MasterTable = {}
        Perma_SaveToFile()
    end

    local entTbl = ents.GetAll()
    local MaxTbl = table.Count(entTbl)
    local bRemove = (p:GetInfoNum("permaall_removeclear", 0) >= 1)

    for i = 1, MaxTbl do
        e = entTbl[i]

        if IsValid(e) and e.PermaID then
            if bRemove then
                e:Remove()
            else
                e.PermaID = nil
                e:SetNWBool("IsPermaEntity", false)
            end
        end
    end

    if a >= 1 then
        p:ConCommand("permaall_secure1 0")
    end
end

concommand.Add("permaall_cleartable", Perma_ClearTable)

function Perma_QueueNet(p)
    timer.Create("PermaAll.Net.Timer", 1, 1, function()
        Perma_SyncKeyValueTable(p)
    end)
end

util.AddNetworkString("PermaAll.Net")

function Perma_PrepKeyValueTable()
    Perma_KeyValueSyncTable = Perma_KeyValueSyncTable or {}

    for k, v in pairs(PermaAll_MasterTable or {}) do
        Perma_KeyValueSyncTable[tostring(v.ID or "")] = {
            Class = (v.Class or nil),
            Model = (v.Model or nil),
            GroupID = (v.PermaGroupID or nil),
        }
    end

    timer.Create("Perma_KeyValueSyncTable.Remover", 5, 1, function()
        Perma_KeyValueSyncTable = nil
    end)
end

function Perma_SyncKeyValueTable(p)
    if not Perma_KeyValueSyncTable then
        Perma_PrepKeyValueTable()
        Perma_SyncKeyValueTable(p)

        return
    end

    local s = util.TableToJSON(Perma_KeyValueSyncTable or {})
    -- COMPRESSED NET MAY BE USING THE BIG NET IDEA SOON
    local ss = util.Compress(s or "")
    net.Start("PermaAll.Net")
    net.WriteFloat(string.len(ss))
    net.WriteData(ss, string.len(ss))

    if IsValid(p) then
        net.Send(p)
    end

    if p == nil then
        net.Broadcast()
    end

    if true then return end
    -- COMPRESSED NET MAY BE USING THE BIG NET IDEA SOON
    -- BIG NET IDEA IF WE HIT THE NETWORK LIMIT AGAIN
    -- local parts = {}
    -- local min, max = 1, 32000
    -- for i=1, string.len(s)/32000 do
    -- print( i )
    -- max = math.min( 32000*i or string.len(s) )
    -- table.insert( parts, string.sub( s, min, max ) )
    -- min = max
    -- end
    -- local bigNetUid = math.random(1111111,9999999)
    -- for i=1, #parts do
    -- timer.Simple( i/10, function()
    -- net.Start( "PermaAll.Net" )
    -- net.WriteFloat( bigNetUid )
    -- net.WriteString( parts[i] )
    -- if IsValid(p) then net.Send( p ) else net.Broadcast() end
    -- end )
    -- end
    -- BIG NET IDEA IF WE HIT THE NETWORK LIMIT AGAIN
end

concommand.Add("PermaAll_RequestSync", function(p, s, t)
    if not Perma_HasAccess(p) then return end
    Perma_SyncKeyValueTable(p)
end)

duplicator.RegisterEntityModifier("PermaGroupID", function(p, e, t)
    if not IsValid(e) then return end
    if not t then return end
    e.PermaGroupID = t[1]
end)

concommand.Add("permaall_import_permaprops", function(p)
    if IsValid(p) and not p:IsSuperAdmin() then return end
    local i = 0

    for k, e in pairs(ents.GetAll()) do
        if e.PermaProps then
            i = i + (e.PermaID == nil and 1 or 0)
            Perma_SaveEntity(e)
        end
    end

    hook.Add("Think", "sv.temp.disable.permaprops.from.spawning.Think", function()
        hook.Remove("PostCleanupMap", "WhenCleanUpPermaProps")
    end)

    p:ChatNotify("[PermaAll] Imported (" .. i .. ") PermaProps")
    p:ChatNotify("You can now remove PermaProps and continue using PermaAll")
end)